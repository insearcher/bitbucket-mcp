import { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import winston from 'winston';

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'bitbucket.log' })],
});

/**
 * Adapter for Bitbucket Server API compatibility
 * Transforms Cloud API calls to Server API format
 */
export class BitbucketServerAdapter {
  private isServer: boolean;

  constructor(private baseUrl: string) {
    // Detect if this is a Server instance (not bitbucket.org)
    this.isServer = !baseUrl.includes('bitbucket.org');
  }

  /**
   * Install interceptors on axios instance
   */
  install(axios: AxiosInstance): void {
    if (!this.isServer) return;

    // Request interceptor - transform URLs and params
    axios.interceptors.request.use((config) => this.transformRequest(config));

    // Response interceptor - transform responses to Cloud format
    axios.interceptors.response.use(
      (response) => this.transformResponse(response),
      (error) => this.transformError(error)
    );
  }

  /**
   * Transform request from Cloud to Server format
   */
  private transformRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (!config.url) return config;

    const originalUrl = config.url;
    
    // Store original URL for later use in response transformation
    (config as any)._originalPath = originalUrl;
    
    // Transform URL paths
    config.url = this.transformUrl(config.url);

    // Transform query parameters
    if (config.params) {
      config.params = this.transformParams(config.params);
    }

    // Transform request body for POST/PUT
    if (config.data && (config.method === 'post' || config.method === 'put')) {
      config.data = this.transformRequestBody(config.url, config.data);
    }

    logger.info('BitbucketServerAdapter: Transformed request', {
      originalUrl,
      transformedUrl: config.url,
      method: config.method,
      params: config.params,
      isDiffstat: originalUrl.includes('diffstat')
    });

    return config;
  }

  /**
   * Transform URL from Cloud to Server format
   */
  private transformUrl(url: string): string {
    // Repository list: /repositories/{workspace} -> /rest/api/1.0/projects/{project}/repos
    if (url.match(/^\/repositories\/([^\/]+)$/)) {
      return url.replace(/^\/repositories\/([^\/]+)$/, '/rest/api/1.0/projects/$1/repos');
    }

    // Single repository: /repositories/{workspace}/{repo} -> /rest/api/1.0/projects/{project}/repos/{repo}
    if (url.match(/^\/repositories\/([^\/]+)\/([^\/]+)$/)) {
      return url.replace(/^\/repositories\/([^\/]+)\/([^\/]+)$/, '/rest/api/1.0/projects/$1/repos/$2');
    }

    // Diffstat endpoint MUST be checked before general pullrequests
    // Diffstat endpoint: /repositories/{workspace}/{repo}/pullrequests/{id}/diffstat -> /rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}/changes
    if (url.includes('/diffstat')) {
      url = url.replace('/pullrequests/', '/pull-requests/');
      return url.replace(/^\/repositories\/([^\/]+)\/([^\/]+)/, '/rest/api/1.0/projects/$1/repos/$2')
                .replace('/diffstat', '/changes');
    }

    // Diff endpoints: /repositories/{workspace}/{repo}/pullrequests/{id}/diff -> /rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}/diff
    if (url.includes('/diff') && url.includes('/pullrequests/')) {
      url = url.replace('/pullrequests/', '/pull-requests/');
      return url.replace(/^\/repositories\/([^\/]+)\/([^\/]+)/, '/rest/api/1.0/projects/$1/repos/$2');
    }

    // Pull request comments: /repositories/{workspace}/{repo}/pullrequests/{id}/comments -> /rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}/activities
    if (url.includes('/pullrequests/') && url.includes('/comments')) {
      url = url.replace('/pullrequests/', '/pull-requests/');
      // In Bitbucket Server, comments are part of activities
      return url.replace(/^\/repositories\/([^\/]+)\/([^\/]+)/, '/rest/api/1.0/projects/$1/repos/$2')
                .replace('/comments', '/activities');
    }

    // Pull request activity: /repositories/{workspace}/{repo}/pullrequests/{id}/activity -> /rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}/activities
    if (url.includes('/pullrequests/') && url.includes('/activity')) {
      url = url.replace('/pullrequests/', '/pull-requests/');
      return url.replace(/^\/repositories\/([^\/]+)\/([^\/]+)/, '/rest/api/1.0/projects/$1/repos/$2')
                .replace('/activity', '/activities');
    }

    // Pull requests: /repositories/{workspace}/{repo}/pullrequests -> /rest/api/1.0/projects/{project}/repos/{repo}/pull-requests
    if (url.includes('/pullrequests')) {
      url = url.replace('/pullrequests', '/pull-requests');
      return url.replace(/^\/repositories\/([^\/]+)\/([^\/]+)/, '/rest/api/1.0/projects/$1/repos/$2');
    }

    // Workspaces: /workspaces -> /rest/api/1.0/projects
    if (url === '/workspaces') {
      return '/rest/api/1.0/projects';
    }

    // Single workspace: /workspaces/{workspace} -> /rest/api/1.0/projects/{project}
    if (url.match(/^\/workspaces\/([^\/]+)$/)) {
      return url.replace(/^\/workspaces\/([^\/]+)$/, '/rest/api/1.0/projects/$1');
    }

    // Branching model endpoints
    if (url.includes('/branching-model')) {
      return url.replace('/workspaces/', '/rest/api/1.0/projects/')
                .replace('/branching-model', '/restrictions');
    }

    return url;
  }

  /**
   * Transform query parameters from Cloud to Server format
   */
  private transformParams(params: any): any {
    const transformed = { ...params };

    // Cloud uses 'limit', Server uses 'limit' too, but let's ensure
    if ('pagelen' in transformed) {
      transformed.limit = transformed.pagelen;
      delete transformed.pagelen;
    }

    // Transform state parameter for pull requests
    if ('state' in transformed && transformed.state) {
      // Cloud: OPEN, MERGED, DECLINED, SUPERSEDED
      // Server: OPEN, MERGED, DECLINED
      if (transformed.state === 'SUPERSEDED') {
        transformed.state = 'DECLINED';
      }
    }

    return transformed;
  }

  /**
   * Transform request body from Cloud to Server format
   */
  private transformRequestBody(url: string, data: any): any {
    // Transform pull request creation
    if (url.includes('/pull-requests')) {
      // Handle both formats: direct params and Cloud API format
      const sourceBranch = data.sourceBranch || data.source?.branch?.name;
      const targetBranch = data.targetBranch || data.destination?.branch?.name || 'master';
      
      if (sourceBranch) {
        const repoSlug = url.match(/\/repos\/([^\/]+)/)?.[1];
        const projectKey = url.match(/\/projects\/([^\/]+)/)?.[1];
        
        return {
          title: data.title,
          description: data.description || '',
          state: 'OPEN',
          open: true,
          closed: false,
          fromRef: {
            id: `refs/heads/${sourceBranch}`,
            repository: {
              slug: repoSlug,
              project: {
                key: projectKey
              }
            }
          },
          toRef: {
            id: `refs/heads/${targetBranch}`,
            repository: {
              slug: repoSlug,
              project: {
                key: projectKey
              }
            }
          },
          reviewers: data.reviewers?.map((username: string) => ({
            user: { name: username }
          })) || []
        };
      }
    }

    return data;
  }

  /**
   * Transform response from Server to Cloud format
   */
  private transformResponse(response: AxiosResponse): AxiosResponse {
    if (!response.config.url) return response;

    const url = response.config.url;

    // Transform paginated responses
    if (response.data && response.data.values) {
      response.data = this.transformPaginatedResponse(url, response.data);
    }
    // Transform single item responses
    else if (response.data) {
      response.data = this.transformSingleResponse(url, response.data);
    }

    return response;
  }

  /**
   * Transform paginated response from Server to Cloud format
   */
  private transformPaginatedResponse(url: string, data: any): any {
    // Projects -> Workspaces
    if (url.includes('/projects') && !url.includes('/repos')) {
      data.values = data.values.map((project: any) => ({
        uuid: `{${project.id}}`,
        name: project.name,
        slug: project.key.toLowerCase(),
        type: 'workspace',
        is_private: true,
        links: {
          self: { href: `${this.baseUrl}/projects/${project.key}` },
          html: { href: `${this.baseUrl}/projects/${project.key}` }
        }
      }));
    }

    // Repositories
    if (url.includes('/repos') && !url.includes('/pull-requests')) {
      data.values = data.values.map((repo: any) => ({
        uuid: `{${repo.id}}`,
        name: repo.name,
        slug: repo.slug,
        full_name: `${repo.project.key}/${repo.slug}`,
        description: repo.description || '',
        is_private: !repo.public,
        type: 'repository',
        scm: repo.scmId || 'git',
        workspace: {
          uuid: `{${repo.project.id}}`,
          name: repo.project.name,
          slug: repo.project.key.toLowerCase(),
          type: 'workspace'
        },
        project: {
          uuid: `{${repo.project.id}}`,
          key: repo.project.key,
          name: repo.project.name,
          type: 'project'
        },
        links: {
          self: { href: `${this.baseUrl}/projects/${repo.project.key}/repos/${repo.slug}` },
          html: { href: `${this.baseUrl}/projects/${repo.project.key}/repos/${repo.slug}` },
          clone: repo.links?.clone || []
        }
      }));
    }

    // Pull request changes (diffstat)
    if (url.includes('/pull-requests/') && url.includes('/changes')) {
      data.values = data.values.map((change: any) => ({
        status: change.type || 'modified',
        new: change.path ? { path: change.path.toString } : null,
        old: change.srcPath ? { path: change.srcPath.toString } : null,
        lines_added: change.linesAdded || 0,
        lines_removed: change.linesRemoved || 0
      }));
    }

    // Pull request activities - handle both comments and activity endpoints
    if (url.includes('/pull-requests/') && url.includes('/activities')) {
      // Transform activities - filter comments if needed
      const activities = data.values || [];
      
      // For comments endpoint, filter only COMMENTED activities
      const comments = activities
        .filter((activity: any) => activity.action === 'COMMENTED')
        .map((activity: any) => ({
          id: activity.comment?.id || activity.id,
          content: {
            raw: activity.comment?.text || '',
            markup: 'markdown',
            html: activity.comment?.text || ''
          },
          user: {
            uuid: `{${activity.user?.id || activity.comment?.author?.id}}`,
            display_name: activity.user?.displayName || activity.comment?.author?.displayName,
            account_id: activity.user?.name || activity.comment?.author?.name
          },
          created_on: activity.createdDate || activity.comment?.createdDate,
          updated_on: activity.updatedDate || activity.comment?.updatedDate,
          type: 'pullrequest_comment',
          links: {
            self: { href: '' },
            html: { href: '' }
          }
        }));
      
      // For activity endpoint, return all activities transformed
      const allActivities = activities.map((activity: any) => {
        const baseActivity = {
          update: {
            date: activity.createdDate,
            author: {
              uuid: `{${activity.user?.id}}`,
              display_name: activity.user?.displayName,
              account_id: activity.user?.name
            }
          }
        };

        // Add specific fields based on activity type
        switch (activity.action) {
          case 'COMMENTED':
            return {
              ...baseActivity,
              comment: {
                id: activity.comment?.id,
                created_on: activity.comment?.createdDate,
                updated_on: activity.comment?.updatedDate,
                content: {
                  raw: activity.comment?.text || '',
                  markup: 'markdown',
                  html: activity.comment?.text || ''
                },
                user: {
                  uuid: `{${activity.comment?.author?.id}}`,
                  display_name: activity.comment?.author?.displayName,
                  account_id: activity.comment?.author?.name
                }
              }
            };
          case 'APPROVED':
          case 'UNAPPROVED':
            return {
              ...baseActivity,
              approval: {
                date: activity.createdDate,
                user: {
                  uuid: `{${activity.user?.id}}`,
                  display_name: activity.user?.displayName,
                  account_id: activity.user?.name
                }
              }
            };
          default:
            return baseActivity;
        }
      });
      
      // Return comments for comments endpoint, all activities for activity endpoint
      // Since we can't differentiate here, return comments by default
      data.values = comments.length > 0 ? comments : allActivities;
    }

    // Pull requests
    if (url.includes('/pull-requests') && !url.includes('/changes') && !url.includes('/activities')) {
      data.values = data.values.map((pr: any) => ({
        id: pr.id,
        title: pr.title,
        description: pr.description || '',
        state: pr.state,
        created_on: pr.createdDate,
        updated_on: pr.updatedDate,
        source: {
          branch: {
            name: pr.fromRef.displayId
          },
          repository: {
            full_name: `${pr.fromRef.repository.project.key}/${pr.fromRef.repository.slug}`
          }
        },
        destination: {
          branch: {
            name: pr.toRef.displayId
          },
          repository: {
            full_name: `${pr.toRef.repository.project.key}/${pr.toRef.repository.slug}`
          }
        },
        author: pr.author?.user ? {
          uuid: `{${pr.author.user.id}}`,
          display_name: pr.author.user.displayName,
          account_id: pr.author.user.name
        } : null,
        reviewers: pr.reviewers?.map((r: any) => ({
          uuid: `{${r.user.id}}`,
          display_name: r.user.displayName,
          account_id: r.user.name,
          approved: r.approved
        })) || [],
        links: {
          self: { href: pr.links?.self?.[0]?.href || '' },
          html: { href: pr.links?.self?.[0]?.href || '' }
        }
      }));
    }

    return data;
  }

  /**
   * Transform single item response from Server to Cloud format
   */
  private transformSingleResponse(url: string, data: any): any {
    // Single project -> workspace
    if (url.match(/\/projects\/[^\/]+$/) && data.key) {
      return {
        uuid: `{${data.id}}`,
        name: data.name,
        slug: data.key.toLowerCase(),
        type: 'workspace',
        is_private: true,
        links: {
          self: { href: `${this.baseUrl}/projects/${data.key}` },
          html: { href: `${this.baseUrl}/projects/${data.key}` }
        }
      };
    }

    // Single repository
    if (url.includes('/repos/') && data.slug && !url.includes('/pull-requests')) {
      return {
        uuid: `{${data.id}}`,
        name: data.name,
        slug: data.slug,
        full_name: `${data.project.key}/${data.slug}`,
        description: data.description || '',
        is_private: !data.public,
        type: 'repository',
        scm: data.scmId || 'git',
        workspace: {
          uuid: `{${data.project.id}}`,
          name: data.project.name,
          slug: data.project.key.toLowerCase(),
          type: 'workspace'
        },
        project: {
          uuid: `{${data.project.id}}`,
          key: data.project.key,
          name: data.project.name,
          type: 'project'
        },
        links: {
          self: { href: `${this.baseUrl}/projects/${data.project.key}/repos/${data.slug}` },
          html: { href: `${this.baseUrl}/projects/${data.project.key}/repos/${data.slug}` },
          clone: data.links?.clone || []
        }
      };
    }

    // Single pull request
    if (url.includes('/pull-requests/') && data.id) {
      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        state: data.state,
        created_on: data.createdDate,
        updated_on: data.updatedDate,
        source: {
          branch: {
            name: data.fromRef.displayId
          },
          repository: {
            full_name: `${data.fromRef.repository.project.key}/${data.fromRef.repository.slug}`
          }
        },
        destination: {
          branch: {
            name: data.toRef.displayId
          },
          repository: {
            full_name: `${data.toRef.repository.project.key}/${data.toRef.repository.slug}`
          }
        },
        author: data.author?.user ? {
          uuid: `{${data.author.user.id}}`,
          display_name: data.author.user.displayName,
          account_id: data.author.user.name
        } : null,
        reviewers: data.reviewers?.map((r: any) => ({
          uuid: `{${r.user.id}}`,
          display_name: r.user.displayName,
          account_id: r.user.name,
          approved: r.approved
        })) || [],
        links: {
          self: { href: data.links?.self?.[0]?.href || '' },
          html: { href: data.links?.self?.[0]?.href || '' }
        }
      };
    }

    return data;
  }

  /**
   * Transform error responses
   */
  private transformError(error: any): Promise<any> {
    if (error.response && error.response.data) {
      // Transform Server error format to Cloud error format
      if (error.response.data.errors) {
        const serverError = error.response.data.errors[0];
        error.response.data = {
          type: 'error',
          error: {
            message: serverError.message || serverError.exceptionName,
            detail: serverError.context || serverError.message
          }
        };
      }
    }
    return Promise.reject(error);
  }
}