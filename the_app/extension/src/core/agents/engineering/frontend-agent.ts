/**
 * Autonomi Extension - Frontend Agent
 *
 * Specialized agent for frontend development tasks including
 * React, Vue, Angular, CSS, HTML, and related technologies.
 *
 * Version: 1.0.0
 */

import { BaseAgent } from '../base-agent';
import { AgentType, Provider, AgentConfig, Tool } from '../../../types';

export class FrontendAgent extends BaseAgent {
  constructor(provider: Provider, config?: Partial<AgentConfig>) {
    super('frontend', provider, config);
  }

  getSystemPrompt(): string {
    return `You are an expert frontend development agent specializing in modern web technologies.

CORE EXPERTISE:
- React (hooks, context, Redux, React Query, Next.js)
- Vue.js (Composition API, Vuex, Pinia, Nuxt.js)
- Angular (RxJS, NgRx, services, modules)
- TypeScript for frontend applications
- CSS/SCSS/Tailwind/CSS-in-JS (styled-components, emotion)
- HTML5 semantics and accessibility (WCAG 2.1)
- State management patterns
- Component architecture and design systems
- Performance optimization (lazy loading, code splitting)
- Testing (Jest, React Testing Library, Cypress)

BEST PRACTICES:
1. Write accessible, semantic HTML
2. Use TypeScript with strict mode
3. Follow component composition patterns
4. Implement proper error boundaries
5. Optimize bundle size and load times
6. Write unit tests for components
7. Use CSS variables for theming
8. Implement responsive design patterns
9. Handle loading and error states
10. Follow the principle of lifting state up appropriately

OUTPUT FORMAT:
- Provide complete, working code
- Include TypeScript types/interfaces
- Add JSDoc comments for public APIs
- Include basic test cases when appropriate
- Use markdown code blocks with language tags

When implementing components:
1. Start with the interface/props definition
2. Implement the component logic
3. Add styling (inline or separate)
4. Include usage examples`;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: 'analyze_component',
        description: 'Analyze a React/Vue/Angular component structure',
        inputSchema: {
          type: 'object',
          properties: {
            componentCode: { type: 'string', description: 'The component code to analyze' },
            framework: { type: 'string', enum: ['react', 'vue', 'angular'] },
          },
          required: ['componentCode'],
        },
      },
      {
        name: 'generate_styles',
        description: 'Generate CSS/SCSS styles for a component',
        inputSchema: {
          type: 'object',
          properties: {
            componentName: { type: 'string' },
            styleSystem: { type: 'string', enum: ['css', 'scss', 'tailwind', 'styled-components'] },
            requirements: { type: 'string' },
          },
          required: ['componentName', 'requirements'],
        },
      },
    ];
  }

  protected suggestNextSteps(task: any, output: string): string[] {
    const suggestions = super.suggestNextSteps(task, output);

    // Frontend-specific suggestions
    if (output.includes('useState') || output.includes('useEffect')) {
      suggestions.push('Consider adding custom hooks for reusable logic');
    }
    if (!output.includes('aria-')) {
      suggestions.push('Review accessibility attributes (aria-*)');
    }
    if (output.includes('className=')) {
      suggestions.push('Consider extracting styles to a CSS module or styled component');
    }
    if (!output.includes('test') && !output.includes('spec')) {
      suggestions.push('Add unit tests with React Testing Library');
    }

    return suggestions;
  }
}

export default FrontendAgent;
