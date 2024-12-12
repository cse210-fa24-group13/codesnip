import * as vscode from 'vscode';


/**
 * Service to authenticate users and retrieve GitHub session access tokens.
 */
export class AuthService {
    /**
     * The type of authentication provider (GitHub in this case).
     */
    private static readonly authType = 'github';
    /**
     * The required scopes for the authentication session.
     */
    private static readonly scopes = ['gist'];
    /**
     * Retrieves a GitHub authentication session with the required scopes.
     * If no session exists, prompts the user to create one.
     * 
     * @returns A promise that resolves to the GitHub authentication session.
     * @throws An error if the GitHub authentication session cannot be retrieved.
     */
    public static async getGitHubSession(): Promise<vscode.AuthenticationSession> {
        try {
            const session = await vscode.authentication.getSession(
                this.authType,
                this.scopes,
                { createIfNone: true }
            );
            return session;
        } catch (err) {
            console.error('GitHub Authentication Error:', err);
            throw new Error('Failed to get GitHub session');
        }
    }
}