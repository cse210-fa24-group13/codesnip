| Field             | Description                                                                                                              |
|-------------------|--------------------------------------------------------------------------------------------------------------------------|
| **Status**        | `accepted `                                            |
| **Date**          | `2024-11-16`                                                                       |
| **Decision-Makers** | `Angus and Kshitij`                                                                            |
| **Consulted**     | `everyone in groups` |
| **Informed**      | `everyone in groups`                    |

# ADR: Choosing a Documentation Tool for the Project

## Context

Our project requires the generation of API documentation. There are several tools available for documenting our code, including **JSDoc**, **TypeDoc**, and **Better Docs**. Each tool has different strengths and weaknesses, especially when considering the use of JavaScript and TypeScript in our project.

We need to decide which tool to use based on the following criteria:
- **Ease of use** (how easy it is to get started)
- **Type support** (ability to document JavaScript and TypeScript effectively)
- **Output quality** (how visually appealing and usable the generated docs are)
- **Community and ecosystem** (availability of plugins, integrations, and community support)
- **Customization** (ability to customize the output, themes, etc.)

## Options

### 1. **JSDoc**
JSDoc is a popular JavaScript documentation generator that works well with both JavaScript and TypeScript (with JSDoc comments). It generates HTML-based documentation from specially formatted comments in the code.

#### Pros:
- **Widely used in JavaScript**: JSDoc is the most widely used documentation tool for JavaScript, meaning a large community and plenty of resources.
- **Easy to use**: Just annotate your JavaScript code with JSDoc-style comments, and run the generator.
- **Supports JavaScript well**: Directly integrated with JavaScript syntax, making it an easy choice for pure JS projects.
- **Works with TypeScript**: While it doesn't natively understand TypeScript types, it can generate documentation for TypeScript code if the types are provided through JSDoc annotations.

#### Cons:
- **Limited TypeScript support**: JSDoc lacks deep integration with TypeScript types. It relies on comments for type information, which can sometimes be error-prone or redundant.
- **Less polished output**: The generated HTML documentation is functional, but its look and feel can be considered basic, and customization might require more work.

#### Use Case:
Best for projects where you primarily use JavaScript and want a straightforward solution to generating documentation. It's also useful for TypeScript projects when you’re not relying heavily on TypeScript's advanced type features.

---

### 2. **TypeDoc**
TypeDoc is a documentation generator designed specifically for TypeScript. It uses TypeScript’s static type system to produce high-quality documentation, with an emphasis on TypeScript features.

#### Pros:
- **TypeScript-first**: TypeDoc provides rich support for TypeScript, fully understanding and leveraging TypeScript’s type system. It generates more detailed and accurate documentation for TypeScript code.
- **Rich output**: The generated documentation is typically cleaner and more polished than JSDoc, with support for modern JavaScript/TypeScript features.
- **Supports JSDoc**: TypeDoc can also parse JSDoc comments in JavaScript files, so it can be used for documenting both TypeScript and JavaScript codebases.

#### Cons:
- **Primarily designed for TypeScript**: While TypeDoc can work with JavaScript, it’s designed with TypeScript in mind. For JavaScript projects, it may not be as seamless as JSDoc.
- **More complex setup**: TypeDoc requires more setup, particularly for JavaScript projects, as you need to ensure that the TypeScript compiler is properly configured and the project files are correctly parsed.

#### Use Case:
Best for TypeScript-heavy projects, where TypeScript’s type information can be fully leveraged to generate detailed and type-safe documentation. It's a good choice if you are working with both TypeScript and JavaScript, but TypeScript is the primary language.

---

### 3. **Better Docs**
Better Docs is a more modern, user-friendly documentation generator. It focuses on providing a beautiful user interface for the generated documentation, with customization and advanced features for creating visually appealing docs.

#### Pros:
- **Highly customizable output**: Better Docs offers highly customizable themes and visual components for generated documentation, allowing teams to create a more branded or tailored experience.
- **Focus on developer experience**: The documentation UI is sleek, modern, and easy to navigate, making it great for projects that require both detailed documentation and a good user experience.
- **Works with BOTH TypeScript and JavaScript**: Better Docs can integrate with both TypeScript and JavaScript projects, although it may require specific configurations for JavaScript code.

#### Cons:
- **More complex setup**: Better Docs requires more setup than JSDoc, and its configuration for JavaScript might not be as seamless as JSDoc.
- **Not as widespread**: Better Docs isn't as widely used as JSDoc or TypeDoc, meaning it might have fewer community resources and integrations.
- **Relatively new**: Being a newer tool, Better Docs might not have the same maturity or robustness as JSDoc and TypeDoc.

#### Use Case:
Best for projects where the appearance of the documentation is a priority, or for teams looking for a modern documentation generator with a customizable interface. It’s also useful for projects that require clean and beautiful output, especially when documentation is a public-facing resource.

---

## Decision

### **JSDoc AND Better Docs**  
We need a solution that works for both JavaScript and TypeScript, as our project includes both types of files. Since JSDoc has limited support with TypeScript and TypeDoc has limited support for JavaScript, we’ve decided to use Better Docs. Since Better Docs is built on JSDoc, we will also be using JSDoc for our annotations.