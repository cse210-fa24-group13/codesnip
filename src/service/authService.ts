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