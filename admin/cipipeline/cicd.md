# CI/CD pipeline
- Linting and code style enforcement (may happen in pipeline and/or in editor)
We decided to use ESLint for linting and Prettier for code style. ESLint is flexible, every single rule is a plugin and you can add more at runtime. 
ESLint analysis is already set up in the GitHub workflow in the existing project.


- Code quality via human review (ex. pull requests)
We have already set up a process. When people make a pull request, other team members are required to review the code and leave comments. We'll not merge the pull request until everyone agrees with the contents.

- Unit tests via automation (ex. Jest, Tape, Ava, Cypress, Mocha/Chai, etc.)
Mocha is setup in the original project for unit tests. However, the test case step is failing when we try to push our documents. We need to figure out what happened.
