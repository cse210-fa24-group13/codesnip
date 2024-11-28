import * as vscode from 'vscode';
export class AuthService {
    private static readonly AUTH_TYPE = 'github';
    private static readonly SCOPES = ['gist'];

    public static async getGitHubSession(): Promise<vscode.AuthenticationSession> {
        try {
            const session = await vscode.authentication.getSession(
                this.AUTH_TYPE,
                this.SCOPES,
                { createIfNone: true }
            );
            
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
            
            return session;
        } catch (err) {
            console.error('GitHub Authentication Error:', err);
            throw new Error('Failed to get GitHub session');
        }
    }
}