# Contributing to uniQue-ue

Thank you for your interest in contributing to uniQue-ue! This document provides guidelines and instructions for contributing to this project.

## 🌟 Ways to Contribute

There are many ways to contribute to this project:

- 🐛 **Report Bugs**: Submit detailed bug reports
- 💡 **Suggest Features**: Share ideas for new features or improvements
- 📝 **Improve Documentation**: Help make our docs clearer and more comprehensive
- 🔧 **Submit Code**: Fix bugs or implement new features
- 🎨 **Design Improvements**: Enhance UI/UX
- 🧪 **Testing**: Help test new features and report issues

## 🚀 Getting Started

### Prerequisites

- Git installed on your machine
- A GitHub account
- Node.js (for running scripts)
- Basic knowledge of HTML, CSS, JavaScript (for code contributions)

### Fork and Clone

1. Fork this repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/djdistraction.github.io.git
   cd djdistraction.github.io
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/djdistraction/djdistraction.github.io.git
   ```

### Setting Up Your Development Environment

1. Install dependencies (if any):
   ```bash
   npm install
   ```

2. For Cloudflare Workers development:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. Test locally by opening HTML files in your browser

## 📋 Contribution Process

### 1. Create a Branch

Create a descriptive branch for your changes:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- **Code Style**: Follow existing code style and conventions
- **Comments**: Add comments for complex logic
- **Documentation**: Update relevant documentation
- **Testing**: Test your changes thoroughly

### 3. Commit Your Changes

Write clear, descriptive commit messages:
```bash
git add .
git commit -m "Add feature: brief description of changes"
```

**Good commit messages:**
- `Fix: Correct navigation link on about page`
- `Add: New feature to graphics studio`
- `Update: Improve README quick start section`
- `Refactor: Simplify ghost-writer.html error handling`

### 4. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub with:
- **Clear title** describing the change
- **Description** explaining what and why
- **Screenshots** for UI changes
- **Testing notes** describing how you tested

## 📝 Code Guidelines

### HTML

- Use semantic HTML5 elements
- Include proper ARIA labels for accessibility
- Add meta tags for SEO
- Maintain consistent indentation (2 or 4 spaces)
- Use descriptive class names

### CSS

- Follow existing Tailwind CSS patterns
- Use brand color variables
- Keep responsive design in mind
- Test on multiple screen sizes

### JavaScript

- Use modern ES6+ syntax
- Add error handling
- Include comments for complex logic
- Test across browsers
- Avoid console.log in production code

### Documentation

- Use clear, concise language
- Include code examples where helpful
- Keep formatting consistent
- Update table of contents if needed

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: How to trigger the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Screenshots**: If applicable
6. **Environment**: Browser, OS, etc.
7. **Additional Context**: Any other relevant information

Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)

## 💡 Suggesting Features

When suggesting features, please include:

1. **Problem**: What problem does this solve?
2. **Solution**: Your proposed solution
3. **Alternatives**: Other solutions considered
4. **Additional Context**: Mockups, examples, etc.

Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)

## 🎨 Design Contributions

For design improvements:

- Maintain brand consistency (colors, fonts, style)
- Consider accessibility (contrast ratios, font sizes)
- Test responsive behavior
- Include mockups or prototypes if possible

## 📚 Documentation Contributions

Documentation improvements are always welcome:

- Fix typos and grammar
- Clarify confusing sections
- Add missing information
- Create tutorials or guides
- Improve code examples

## 🔍 Code Review Process

All submissions require review. We may:

- Request changes or clarifications
- Suggest improvements
- Ask for tests or documentation
- Merge your contribution

Be patient and responsive to feedback!

## ✅ Pull Request Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] Changes are well-documented
- [ ] All tests pass (if applicable)
- [ ] Commit messages are clear
- [ ] PR description is complete
- [ ] Screenshots included (for UI changes)
- [ ] Documentation updated (if needed)
- [ ] No unnecessary files committed

## 🏷️ Labels

We use these labels for issues and PRs:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `question`: Further information requested
- `wontfix`: This will not be worked on

## 🤝 Community Guidelines

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Help others when you can
- Follow our Code of Conduct

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## ❓ Questions?

If you have questions about contributing:

1. Check existing [documentation](DOCS_INDEX.md)
2. Search [existing issues](https://github.com/djdistraction/djdistraction.github.io/issues)
3. Ask in a new issue with the `question` label
4. Use the [contact form](index.html#contact)

## 🙏 Thank You!

Every contribution helps make uniQue-ue better. We appreciate your time and effort!

---

**Happy Contributing! 🚀**
