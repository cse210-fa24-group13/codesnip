| Field             | Description                                                                                                              |
|-------------------|--------------------------------------------------------------------------------------------------------------------------|
| **Status**        | `Proposed `                                            |
| **Date**          | `2024-21-11`                                                                       |
| **Decision-Makers** | `Tanmay`                                                                            |
| **Consulted**     | `Dylan` |
| **Informed**      | `Team Members` |

# Choose C8 vs NYC for Code Coverage in VS Code Extension

## Context and Problem Statement

We are working on extending a TypeScript-based VS Code extension and need to choose a code coverage tool to ensure that our code is properly tested and we have coverage reporting in place. The options under consideration are C8 and NYC. Both tools support TypeScript, but they differ in terms of setup complexity, features, performance, and TypeScript support. 

Our primary concern is to select a tool that integrates easily with our current testing setup and provides clear and fast code coverage reporting.

## Decision Drivers

- Ease of setup: The tool should be easy to configure
- Performance: The tool should have minimal overhead and should generate code coverage reports quickly
- TypeScript compatibility: The tool should handle TypeScript files effectively and support accurate coverage reporting
- Reporting capabilities: The tool should generate useful coverage reports in multiple formats
- Maintainability: The tool should be simple enough to maintain



## Considered Options

- C8
- NYC

## Decision Outcome

Chosen option: **C8**

- C8, because it meets the key decision drivers, particularly ease of setup, performance, and TypeScript compatibility. 

- C8 provides a straightforward, minimal configuration to work with TypeScript and Mocha. The performance and simplicity align well with our project's needs. We can add coverage reports in HTML, text-summary and LCOV formats.

## Consequences

- Good, because C8 has a minimalistic setup and fast performance.

- Bad, because C8 is a newer tool with a smaller ecosystem compared to NYC.

- Neutral, because C8’s simpler configuration means we may need to implement some features

## Confirmation

The implementation will be confirmed through code reviews and a CI pipeline that ensures the coverage report is generated in the required formats and is published to CodeClimate and that it runs efficiently with the current test suite. 

# Pros and Cons of the Options

C8

- Good, because it has a simpler setup for TypeScript and Mocha
- Good, because it is fast and optimized for performance
- Good, because it produces essential coverage reports without extra configuration
- Bad, because it is a newer tool with a smaller community


NYC

- Good, because it is a mature tool with a large community and extensive documentation
- Good, because it provides advanced features like coverage thresholds, multiple reporting formats, and better support for complex test setups.
- Neutral, because NYC requires additional configuration for TypeScript support.
- Bad, because it has more complex setup compared to C8
- Bad, because it is slower than C8 due to its additional features and complexity.