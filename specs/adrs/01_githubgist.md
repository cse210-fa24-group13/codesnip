
# ADR: Use GitHub Gists for Snippet Storage and Sharing


| **Field**            | **Description**      |
|-----------------------|----------------------|
| **Status**           | Approved            |
| **Date**             | 2024-11-23          |
| **Decision-Makers**  | Kshitij, Jyotika    |
| **Consulted**        | Team Members, Dylan |
| **Informed**         | Team Members        |

---

## Context and Problem Statement
Our project aims to develop a code snippet management platform tailored to the needs of modern developers. The goal is to create a centralized, user-friendly tool that allows developers to organize, access, reuse, and share their code snippets efficiently, boosting productivity.  

A robust, scalable, and user-friendly solution is required for storing and managing these snippets. Additionally, the solution must support sharing and embedding snippets while ensuring accessibility across devices.

**Primary Challenge**:  
How should the platform handle snippet storage and sharing in a way that simplifies sharing and minimizes infrastructure complexity?

---

## Decision Drivers
1. The need for lightweight storage without setting up and maintaining complex infrastructure.
2. Selective accessibility.
3. Integration with existing developer workflows and ecosystems.
4. Ability to embed snippets into web pages and share them publicly or securely.
5. Minimal dependency on custom infrastructure and maximum use of existing tools.

---

## Considered Options
1. Use GitHub Gists for storage and sharing.
2. Use a cloud-based storage service.
3. Use QR codes.

---

## Decision Outcome
**Chosen Option**:  
Use **GitHub Gists**, because it satisfies the decision drivers effectively:
- Offers built-in sharing.
- Enables easy embedding and sharing via public URLs.
- Reduces complexity by leveraging an established platform.
- Minimizes development effort for storage and sharing mechanisms.

---

## Consequences

### Positive Consequences
- Simplifies development by using GitHub’s infrastructure, avoiding the need to build and maintain custom solutions.
- Allows users to leverage GitHub's ecosystem, providing familiarity and ease of use.
- Enables rich features like snippet embedding, public sharing, and syntax highlighting without additional libraries.
- Integrates seamlessly with developer workflows.

### Negative Consequences
- Dependency on GitHub's availability and API rate limits.
- Limited customization options for storage structure compared to a custom database.

---

## Confirmation
The implementation of this decision will be confirmed by:
1. Integrating GitHub Gists using the GitHub API and embedding test snippets in the web app to validate the storage and sharing workflow.
2. Testing the end-to-end flow:
   - Creating a snippet.
   - Fetching it via the API.
   - Embedding it on a webpage.
   - Downloading it as a file.
3. Ensuring compliance with GitHub API rate limits and using caching to mitigate excessive API requests.

---

## Pros and Cons of the Options

### Option 1: Use GitHub Gists
**Pros**:
- Lightweight and eliminates the need for custom infrastructure.
- Public snippets are embeddable into web pages directly.
- Selective accessibility.  

**Neutral**:  
- Depends on GitHub’s API and availability.

**Cons**:
- Limited file size.
- Potential rate-limiting issues for large-scale usage.

---

### Option 2: Cloud-Based Storage Services
**Pros**:
- High scalability and availability.
- Customizable and integrates with other services like Lambda for event-driven workflows.


**Cons**:
- Adds operational cost and complexity for small-scale projects.

---

### Option 3: Use QR Codes
**Pros**:
- Easy to generate and share as static images.
- No infrastructure needed for storage.

**Neutral**:  
- Suitable only for short code snippets due to data size limitations of QR codes.

**Cons**:
-  Static encoding means updates require new QR codes.
- Decoding and displaying larger snippets becomes impractical, limiting usability.

---

## More Information
- [GitHub Gists API Documentation](https://docs.github.com/en/rest/gists)  
- GitHub Gist embedding guide for syntax-highlighted snippets.  


