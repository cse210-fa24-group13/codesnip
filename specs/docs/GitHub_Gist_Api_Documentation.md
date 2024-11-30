# GitHub Gists API Documentation

The GitHub Gists API allows you to interact with GitHub gists programmatically. This documentation covers the endpoints for creating, retrieving, and listing gists.

## Base URL
All requests to the Gists API should be made to the following base URL: https://api.github.com


---

## Authentication
You need an OAuth token with the `gist` scope to interact with the Gists API. Include the token in the `Authorization` header:

```http
Authorization: Bearer YOUR_TOKEN_FROM_VSCODE
```

## Endpoints

### 1. Create a Gist

#### Create a new gist by providing content, description, and visibility

```http
POST /gists
```

#### Request Headers

| Header | Value |
|--------|-------|
| Authorization  | Bearer YOUR_TOKEN | 
| Content-Type   | application/json  | 


#### Request Body


| Field | Type | Required | Description |
|-------|------|----------|-------------|
| description  | string   | Yes   | A short description of the gist. |
| public       | boolean  | Yes   | Set to true for a public gist, false for a private one. |
| files        | object   | Yes   | A key-value object where keys are filenames and values are file content |


#### Example Request Body

```json
{
  "description": "Example gist",
  "public": true,
  "files": {
    "example.txt": {
      "content": "Hello, world!"
    }
  }
}
```

#### Response

- **201 Created**: The gist was successfully created. Returns the created gist details.
- **400 Bad Request**: Invalid request payload or missing required fields.
<br/><br/>
--- 

### 2. List gists for the authenticated user

Lists the authenticated user's gists or if called anonymously, this endpoint returns all public gists

```http
GET /gists
```

#### Request Headers

| Header | Value |
|--------|-------|
| Authorization  | Bearer YOUR_TOKEN | 
| accept | application/vnd.github+json |


#### Request Body


| Field | Type | Required | Description |
|-------|------|----------|-------------|
| since  | string   | No   | Only show results that were last updated after the given time. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ. |
| per_page       | integer  | No   | The number of results per page (max 100) Default: 30 |
| page        | integer   | No   | The page number of the results to fetch. Default: 1 |



#### Response Codes

- **200 OK**
- **304 Not Modified**
- **403 Forbidden**


#### Example Response 

```json
[
  {
    "url": "https://api.github.com/gists/aa5a315d61ae9438b18d",
    "forks_url": "https://api.github.com/gists/aa5a315d61ae9438b18d/forks",
    "commits_url": "https://api.github.com/gists/aa5a315d61ae9438b18d/commits",
    "id": "aa5a315d61ae9438b18d",
    "node_id": "MDQ6R2lzdGFhNWEzMTVkNjFhZTk0MzhiMThk",
    "git_pull_url": "https://gist.github.com/aa5a315d61ae9438b18d.git",
    "git_push_url": "https://gist.github.com/aa5a315d61ae9438b18d.git",
    "html_url": "https://gist.github.com/aa5a315d61ae9438b18d",
    "files": {
      "hello_world.rb": {
        "filename": "hello_world.rb",
        "type": "application/x-ruby",
        "language": "Ruby",
        "raw_url": "https://gist.githubusercontent.com/octocat/6cad326836d38bd3a7ae/raw/db9c55113504e46fa076e7df3a04ce592e2e86d8/hello_world.rb",
        "size": 167
      }
    },
    "public": true,
    "created_at": "2010-04-14T02:15:15Z",
    "updated_at": "2011-06-20T11:34:15Z",
    "description": "Hello World Examples",
    "comments": 0,
    "user": null,
    "comments_url": "https://api.github.com/gists/aa5a315d61ae9438b18d/comments/",
    "owner": {
      "login": "octocat",
      "id": 1,
      "node_id": "MDQ6VXNlcjE=",
      "avatar_url": "https://github.com/images/error/octocat_happy.gif",
      "gravatar_id": "",
      "url": "https://api.github.com/users/octocat",
      "html_url": "https://github.com/octocat",
      "followers_url": "https://api.github.com/users/octocat/followers",
      "following_url": "https://api.github.com/users/octocat/following{/other_user}",
      "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
      "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
      "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
      "organizations_url": "https://api.github.com/users/octocat/orgs",
      "repos_url": "https://api.github.com/users/octocat/repos",
      "events_url": "https://api.github.com/users/octocat/events{/privacy}",
      "received_events_url": "https://api.github.com/users/octocat/received_events",
      "type": "User",
      "site_admin": false
    },
    "truncated": false
  }
]
```

<br>

-----

### 3. Get a gist

Gets a specified gist using the gist id

```http
GET /gists/{gist_id}
```

#### Request Headers

| Header | Value |
|--------|-------|
| Authorization  | Bearer YOUR_TOKEN | 
| accept | application/vnd.github+json |

#### Path Parameters

| Param | Value | Type | Required | Description |
|--------|-------| -- |-- |-- |
| gist_id  | Gist Identifier | string | Yes | The unique identifier of the gist. |



#### Response Codes

- **200 OK**
- **304 Not Modified**
- **403 Forbidden**
- **404 Resource not found**


#### Example Response 

```json
{
  "url": "https://api.github.com/gists/2decf6c462d9b4418f2",
  "forks_url": "https://api.github.com/gists/2decf6c462d9b4418f2/forks",
  "commits_url": "https://api.github.com/gists/2decf6c462d9b4418f2/commits",
  "id": "2decf6c462d9b4418f2",
  "node_id": "G_kwDOBhHyLdZDliNDQxOGYy",
  "git_pull_url": "https://gist.github.com/2decf6c462d9b4418f2.git",
  "git_push_url": "https://gist.github.com/2decf6c462d9b4418f2.git",
  "html_url": "https://gist.github.com/2decf6c462d9b4418f2",
  "files": {
    "README.md": {
      "filename": "README.md",
      "type": "text/markdown",
      "language": "Markdown",
      "raw_url": "https://gist.githubusercontent.com/monalisa/2decf6c462d9b4418f2/raw/ac3e6daf176fafe73609fd000cd188e4472010fb/README.md",
      "size": 23,
      "truncated": false,
      "content": "Hello world from GitHub",
      "encoding": "utf-8"
    }
  },
  "public": true,
  "created_at": "2022-09-20T12:11:58Z",
  "updated_at": "2022-09-21T10:28:06Z",
  "description": "An updated gist description.",
  "comments": 0,
  "user": null,
  "comments_url": "https://api.github.com/gists/2decf6c462d9b4418f2/comments",
  "owner": {
    "login": "monalisa",
    "id": 104456405,
    "node_id": "U_kgDOBhHyLQ",
    "avatar_url": "https://avatars.githubusercontent.com/u/104456405?v=4",
    "gravatar_id": "",
    "url": "https://api.github.com/users/monalisa",
    "html_url": "https://github.com/monalisa",
    "followers_url": "https://api.github.com/users/monalisa/followers",
    "following_url": "https://api.github.com/users/monalisa/following{/other_user}",
    "gists_url": "https://api.github.com/users/monalisa/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/monalisa/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/monalisa/subscriptions",
    "organizations_url": "https://api.github.com/users/monalisa/orgs",
    "repos_url": "https://api.github.com/users/monalisa/repos",
    "events_url": "https://api.github.com/users/monalisa/events{/privacy}",
    "received_events_url": "https://api.github.com/users/monalisa/received_events",
    "type": "User",
    "site_admin": true
  },
  "forks": [],
  "history": [
    {
      "user": {
        "login": "monalisa",
        "id": 104456405,
        "node_id": "U_kgyLQ",
        "avatar_url": "https://avatars.githubusercontent.com/u/104456405?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/monalisa",
        "html_url": "https://github.com/monalisa",
        "followers_url": "https://api.github.com/users/monalisa/followers",
        "following_url": "https://api.github.com/users/monalisa/following{/other_user}",
        "gists_url": "https://api.github.com/users/monalisa/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/monalisa/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/monalisa/subscriptions",
        "organizations_url": "https://api.github.com/users/monalisa/orgs",
        "repos_url": "https://api.github.com/users/monalisa/repos",
        "events_url": "https://api.github.com/users/monalisa/events{/privacy}",
        "received_events_url": "https://api.github.com/users/monalisa/received_events",
        "type": "User",
        "site_admin": true
      },
      "version": "468aac8caed5f0c3b859b8286968",
      "committed_at": "2022-09-21T10:28:06Z",
      "change_status": {
        "total": 2,
        "additions": 1,
        "deletions": 1
      },
      "url": "https://api.github.com/gists/8481a81af6b7a2d418f2/468aac8caed5f0c3b859b8286968"
    }
  ],
  "truncated": false
}
```

<br>

-----