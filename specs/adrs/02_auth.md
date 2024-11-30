| Field             | Description                                                                                                              |
|-------------------|--------------------------------------------------------------------------------------------------------------------------|
| **Status**        | ``                                            |
| **Date**          | `2024-29-11`                                                                       |
| **Decision-Makers** | `Chris Xia, Rohan`                                                                            |
| **Consulted**     | `Team Members` |
| **Informed**      | `Team Members` |

# GitHub Authentication

## Context and Problem Statement

In order to get gist from GitHub, we need to use GitHub API to do authentication and access the data.

## Tool
`VS Code API` is a set of JavaScript APIs that you can invoke in your Visual Studio Code extension.

`vscode.authentication.getSession()` gets an authentication session matching the desired scopes. Currently, there are only two authentication providers that are contributed from built in extensions to the editor that implement GitHub and Microsoft authentication: their providerId's are `github` and `microsoft`.

```javascript
// example usage
const session = await vscode.authentication.getSession(
    'github', // provider
    ['gist'], // scope
    { createIfNone: true }
);
```

For more info about scope: [Scopes for GitHub OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)