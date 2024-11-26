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
            return session;
        } catch (err) {
            throw new Error('Failed to get GitHub session');
        }
    }

    public static async checkAuthStatus(): Promise<boolean> {
        try {
            const session = await this.getGitHubSession();
            return !!session;
        } catch {
            return false;
        }
    }
}