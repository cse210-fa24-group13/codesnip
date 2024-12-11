import * as vscode from 'vscode';
export class AuthService {
    private static readonly authType = 'github';
    private static readonly scopes = ['gist'];

    public static async getGitHubSession(): Promise<vscode.AuthenticationSession> {
        try {
            const session = await vscode.authentication.getSession(
                this.authType,
                this.scopes,
                { createIfNone: true }
            );
            
            // Detailed session logging        
            
            return session;
        } catch (err) {
            console.error('GitHub Authentication Error:', err);
            throw new Error('Failed to get GitHub session');
        }
    }
}