| Field             | Description                                                                                                              |
|-------------------|--------------------------------------------------------------------------------------------------------------------------|
| **Status**        | ``                                            |
| **Date**          | `2024-29-11`                                                                       |
| **Decision-Makers** | `Chris Xia, Rohan`                                                                            |
| **Consulted**     | `Team Members` |
| **Informed**      | `Team Members` |

# GitHub Authentication

## Context and Problem Statement

In order to get gist from GitHub, we need to use GitHub API to do authentication. The authentication needs to be secure, user-friendly, and integrated with VS Code's built-in authentication system.

## Tool
`VS Code API` is a set of JavaScript APIs that you can invoke in your Visual Studio Code extension.

`vscode.authentication.getSession()` gets an authentication session matching the desired scopes. Currently, there are only two authentication providers that are contributed from built in extensions to the editor that implement GitHub and Microsoft authentication: their providerId's are `github` and `microsoft`.

```javascript
// example usage
const session = await vscode.authentication.getSession(
    'github', // provider
    ['gist'], // scope
    { createIfNone: true } // Whether login should be performed if there is no matching session.
);
```
For more info about VScode API: [VS Code API](https://code.visualstudio.com/api/references/vscode-api#AuthenticationGetSessionOptions)

For more info about scope: [Scopes for GitHub OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)

```javascript
// Detailed session logging
console.log('GitHub Session Details:', {
    id: session.id,
    account: {
        id: session.account.id,
        label: session.account.label
    },
    scopes: session.scopes,
    accessToken: session.accessToken  
});
```

## Decision Drivers

- Need secure access to GitHub Gists API
- Must integrate seamlessly with VS Code
- Should provide good user experience
- Must handle token storage securely
- Should support token refresh and session management
- Need to minimize implementation complexity


## Considered Options

VS Code's Built-in GitHub Authentication
- Uses vscode.authentication.getSession()
- Handles token storage automatically
- Integrated with VS Code security

Custom OAuth Implementation
- Direct GitHub OAuth flow
- Manual token management
- Custom token storage

Personal Access Token
- Manual token generation by user
- Static token storage
- No automatic refresh

## Decision Outcome

Chosen option: "VS Code's Built-in GitHub Authentication" because:
- Provides secure token storage
- Handles authentication flow automatically
- Integrates natively with VS Code
- Reduces implementation complexity
- Maintains consistent user experience

## Consequences

- Good, because secure token management through VS Code's system.
- Bad, because dependent on VS Code's authentication API.


# Pros and Cons of the Options

VS Code's Built-in GitHub Authentication
Pros:
- Secure token storage
- Automatic token refresh
- Native VS Code integration
- Simple implementation

Cons:
- Limited to VS Code
- Less customization options


Custom OAuth Implementation
Pros:
- Full control over auth flow
- Platform independent
- Customizable UI

Cons:
- Complex implementation
- Manual token management
- Custom security implementation needed


Personal Access Token
Pros:
- Simple to implement
- Platform independent
- Direct GitHub API access

Cons:
- No automatic refresh
- Manual token generation
- Poor user experience