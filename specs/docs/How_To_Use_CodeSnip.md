## Code Snippet Management in VS Code using CodeSnip Tool

## Overview

**CodeSnip** is a VS Code extension designed to boost productivity by streamlining the creation, management, and sharing of code snippets. It simplifies repetitive coding tasks and enhances workflow efficiency.

## Features

- **Create**: Easily create snippets with a few clicks.
- **Open**: Quickly open and use your snippets from anywhere in VS Code.
- **Search**: Find your snippets quickly.
- **Manage**: Organize snippets freely without a forced order. Modify or remove them as needed.
- **Share**: Share snippets with your co-workers via our tool. All you need to do is share a Snippet ID with them!

## Additional Features

- Create snippets directly from the open editor or clipboard.
- Manually create snippets.
- Open snippets with a single click.
- Drag and drop snippets into the editor.
- Copy snippets to the clipboard.
- Search for snippets using the Command Palette.
- Preview snippets before inserting them.
- Drag and drop snippets between folders.
- Reorder snippets with Up and Down actions.
- Add descriptions to snippets.

## Development Setup

#### Prerequisites

- **Node.js** (Recommended: Version 22.x or higher)
- **npm** (Update to version 10.9.0)
- **Visual Studio Code** installed on your machine

#### Setting up the Development Environment

1. To clone the repository via HTTPS, run the command:

    ```bash
    git clone https://github.com/cse210-fa24-group13/codesnip.git
    ```

2. Run the following commands in the terminal:

    ```bash
    set-executionPolicy -scope process -executionpolicy bypass
    ```

    ```bash
    npm install --save-dev webpack webpack-cli
    npm run compile
    ```

3. Open the debug window in VS Code by selecting **Run and Debug**.
    - A new VS Code window will open with the extension active for debugging.
    - Click the web view button to see all snippets displayed effectively.

## Build Instructions

#### Method 1: Using NPM and Debug Window

1. Compile the extension using:

    ```bash
    npm run compile
    ```

2. Debug the extension by running it from the debug window in VS Code.

![Running the extension](<run-debug.png>)

#### Method 2: Using VSIX File

1. Install VSCE globally:

    ```bash
    npm install -g vsce
    ```

2. Package the extension into a `.vsix` file:

    ```bash
    vsce package
    ```

3. Install the `.vsix` file in VS Code:
    - Open the Extensions view (**Ctrl+Shift+X** or **Cmd+Shift+X** on macOS).
    - Click on the menu (three dots in the top-right corner) and select **Install from VSIX...**.
    - Choose the packaged `.vsix` file to install the extension.


## High-Level Architecture

The extension uses a modular architecture to handle various snippet-related tasks. Key components include:

- **Snippet Creation**: Manages snippet generation from different sources (editor, clipboard, manual entry).
- **Snippet Storage**: Organizes snippets into folders and handles reordering and drag-and-drop functionality.
- **Snippet Sharing**: Allows sharing of snippets via GitHub Gists.
- **Search and Open**: Optimized search functionality through the Command Palette.

## Key Files

- **`src/extensions.ts`**: This file contains the main functionality for a VS Code extension that manages code snippets. It includes commands for adding, editing, and deleting snippets, as well as features like importing/exporting snippets, sorting, and integration with GitHub Gists.

- **`src/config/commands.ts`**: The code utilizes the VS Code API to interact with the editor and display user interface elements like quick picks and progress indicators. It also incorporates authentication with GitHub to perform operations on Gists, demonstrating integration between the extension and external services.


- **`src/config/labels.ts`**: Contains a comprehensive set of string constants used for various messages, prompts, and labels within a VS Code extension. The labels cover a wide range of functionalities, including snippet management, user interactions, error messages, and system notifications.



## Steps to update the dependencies

- Update npm:

    ```bash
    npm install -g npm@10.9.0
    ```

- Check for updates with `ncu`:

    ```bash
    ncu
    ncu -r
    npm install
    ```

- Warnings during updates can be ignored.

- Migrate ESLint Configuration:

    ```bash
    npx @eslint/migrate-config .eslintrc.json
    ```

    Update `package.json` to reflect the new configuration format:

    ```json
    "lint": "eslint src"
    ```

## Update GitHub Workflow Configurations

- Change `node-version` to `22.x` in workflow files:

    ```yaml
    node-version: 22.x
    ```

## Testing

1. Run unit tests using the configured GitHub workflows.
2. Ensure all functionality aligns with expected behaviors outlined in the features section.
3. To run the test, use:

    ```bash
    npm run test
    ```


## Code Documentation

> Learn more about how the code works and the implementation details
> 
> Documentation for the code is auto-generated and hosted at https://cse210-fa24-group13.github.io/codesnip/

![image](https://github.com/user-attachments/assets/2e176752-52f8-4cef-90e7-a233156d1f5d)

## Code Quality

> Learn more about the code quality of the project
> 
> To check it out, head over to: https://codeclimate.com/github/cse210-fa24-group13/codesnip/

![image](https://github.com/user-attachments/assets/3711d010-192d-484f-b874-58f51eeb250a)


## Additional Notes

- We are using `eslint` to ensure code quality.
- Reference ADRs in the repository for detailed architectural decisions: [ADRs](https://github.com/cse210-fa24-group13/codesnip/tree/main/specs/adrs).
- More documentation is available at: [Docs](https://github.com/cse210-fa24-group13/codesnip/tree/main/specs/docs).
