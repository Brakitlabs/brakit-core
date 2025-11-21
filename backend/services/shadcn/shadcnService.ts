import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logger } from "../../utils/logger";
import { ensurePackagesInstalled } from "../shared/dependencyInstaller";

const BASE_SHADCN_DEPENDENCIES = [
  "class-variance-authority",
  "lucide-react",
  "clsx",
  "tailwind-merge",
];

const execAsync = promisify(exec);

export interface InstallProgress {
  stage: "checking" | "initializing" | "installing" | "complete" | "error";
  message: string;
  component?: string;
}

export type ProgressCallback = (progress: InstallProgress) => void;

export interface ShadcnComponentInfo {
  name: string;
  dependencies?: string[];
}

/**
 * Maps canvas component types to shadcn component names and their dependencies
 * This is a comprehensive mapping for all commonly used ShadCN components
 */
const COMPONENT_MAP: Record<string, ShadcnComponentInfo> = {
  // Buttons
  button: { name: "button" },
  "button-outline": { name: "button" },
  "button-link": { name: "button" },
  "button-destructive": { name: "button" },
  "button-ghost": { name: "button" },

  // Layout & Display
  card: { name: "card" },
  alert: { name: "alert" },
  badge: { name: "badge" },
  separator: { name: "separator" },
  "divider-horizontal": { name: "separator" },
  "divider-vertical": { name: "separator" },
  avatar: { name: "avatar" },
  skeleton: { name: "skeleton" },

  // Form Inputs
  input: { name: "input" },
  textarea: { name: "textarea" },
  checkbox: { name: "checkbox", dependencies: ["label"] },
  radio: { name: "radio-group", dependencies: ["label"] },
  select: { name: "select" },
  switch: { name: "switch", dependencies: ["label"] },
  slider: { name: "slider" },

  // Navigation & Structure
  tabs: { name: "tabs" },
  accordion: { name: "accordion" },

  // Typography (no ShadCN component needed)
  heading: { name: "typography" }, // Uses native h2
  subheading: { name: "typography" }, // Uses native h3
  text: { name: "typography" }, // Uses native p
  link: { name: "typography" }, // Uses native a
  lead: { name: "typography" },
  large: { name: "typography" },
  small: { name: "typography" },
  muted: { name: "typography" },

  // Complex Forms
  "login-form": { name: "form", dependencies: ["button", "input"] },
  "signup-form": {
    name: "form",
    dependencies: ["button", "input", "checkbox"],
  },
  "contact-form": {
    name: "form",
    dependencies: ["button", "input", "textarea"],
  },
  "newsletter-form": { name: "form", dependencies: ["button", "input"] },
};

export class ShadcnService {
  private projectRoot: string;
  private componentsPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.componentsPath = this.findComponentsPath();
  }

  private getUtilityFilePath(): string {
    const candidates = [
      path.join(this.projectRoot, "src", "lib", "utils.ts"),
      path.join(this.projectRoot, "lib", "utils.ts"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  private ensureUtilityFile(): void {
    const utilityPath = this.getUtilityFilePath();
    if (fs.existsSync(utilityPath)) {
      return;
    }

    fs.mkdirSync(path.dirname(utilityPath), { recursive: true });

    const content = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

    fs.writeFileSync(utilityPath, content, "utf8");
    logger.info({
      message: "Created shadcn utility helper",
      context: { path: utilityPath },
    });
  }

  /**
   * Find where shadcn components are stored (src/components/ui or components/ui)
   */
  private findComponentsPath(): string {
    const possiblePaths = [
      path.join(this.projectRoot, "src", "components", "ui"),
      path.join(this.projectRoot, "components", "ui"),
    ];

    for (const componentPath of possiblePaths) {
      if (fs.existsSync(componentPath)) {
        return componentPath;
      }
    }

    // Default to src/components/ui even if it doesn't exist yet
    return path.join(this.projectRoot, "src", "components", "ui");
  }

  /**
   * Check if shadcn is initialized by looking for components.json
   */
  isShadcnInitialized(): boolean {
    const componentsConfigPath = path.join(this.projectRoot, "components.json");
    return fs.existsSync(componentsConfigPath);
  }

  /**
   * Initialize shadcn in the project
   */
  async initializeShadcn(onProgress?: ProgressCallback): Promise<void> {
    if (this.isShadcnInitialized()) {
      await this.ensureBaseDependencies(onProgress);
      logger.info({ message: "ShadCN already initialized" });
      return;
    }

    onProgress?.({
      stage: "initializing",
      message: "Initializing ShadCN...",
    });

    logger.info({ message: "Initializing ShadCN" });

    try {
      // Run shadcn-ui init with default options
      // Using --yes for non-interactive mode
      await execAsync("npx shadcn@latest init --yes --defaults", {
        cwd: this.projectRoot,
        timeout: 60000, // 60 second timeout
      });

      await this.ensureBaseDependencies(onProgress);

      logger.info({ message: "ShadCN initialized successfully" });
      onProgress?.({
        stage: "complete",
        message: "ShadCN initialized successfully",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error({
        message: "Failed to initialize ShadCN",
        context: { error: errorMessage },
      });
      onProgress?.({
        stage: "error",
        message: `Failed to initialize ShadCN: ${errorMessage}`,
      });
      throw new Error(`ShadCN initialization failed: ${errorMessage}`);
    }
  }

  private async ensureBaseDependencies(
    onProgress?: ProgressCallback
  ): Promise<void> {
    await ensurePackagesInstalled(this.projectRoot, BASE_SHADCN_DEPENDENCIES, {
      label: "shadcn dependencies",
      onProgress: (message) =>
        onProgress?.({
          stage: "installing",
          message,
        }),
    });
    this.ensureUtilityFile();
  }

  /**
   * Check if a specific component is installed
   */
  isComponentInstalled(componentName: string): boolean {
    const componentFile = path.join(
      this.componentsPath,
      `${componentName}.tsx`
    );
    return fs.existsSync(componentFile);
  }

  /**
   * Install a specific shadcn component
   */
  async installComponent(
    componentName: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    if (this.isComponentInstalled(componentName)) {
      logger.info({
        message: "Component already installed",
        context: { component: componentName },
      });
      return;
    }

    onProgress?.({
      stage: "installing",
      message: `Installing ${componentName}...`,
      component: componentName,
    });

    logger.info({
      message: "Installing shadcn component",
      context: { component: componentName },
    });

    try {
      // Run shadcn-ui add command with --yes for non-interactive mode
      await execAsync(`npx shadcn@latest add ${componentName} --yes`, {
        cwd: this.projectRoot,
        timeout: 60000, // 60 second timeout
      });

      logger.info({
        message: "Component installed successfully",
        context: { component: componentName },
      });

      onProgress?.({
        stage: "complete",
        message: `${componentName} installed successfully`,
        component: componentName,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error({
        message: "Failed to install component",
        context: { component: componentName, error: errorMessage },
      });
      onProgress?.({
        stage: "error",
        message: `Failed to install ${componentName}: ${errorMessage}`,
        component: componentName,
      });
      throw new Error(`Failed to install ${componentName}: ${errorMessage}`);
    }
  }

  /**
   * Get all required shadcn components for a canvas component type
   */
  getRequiredComponents(componentType: string): string[] {
    const info = COMPONENT_MAP[componentType];
    if (!info) {
      // For unknown component types, try to use them directly
      logger.warn({
        message: "Component type not in COMPONENT_MAP, attempting direct use",
        context: { componentType },
      });
      return [componentType];
    }

    const components = [info.name];
    if (info.dependencies) {
      components.push(...info.dependencies);
    }

    // Filter out typography (no installation needed)
    return [...new Set(components)].filter((comp) => comp !== "typography");
  }

  /**
   * Ensure all required components for a canvas component type are installed
   */
  async ensureComponentsForType(
    componentType: string,
    onProgress?: ProgressCallback
  ): Promise<string[]> {
    // First ensure shadcn is initialized
    if (!this.isShadcnInitialized()) {
      await this.initializeShadcn(onProgress);
    } else {
      await this.ensureBaseDependencies(onProgress);
    }

    const requiredComponents = this.getRequiredComponents(componentType);

    if (requiredComponents.length === 0) {
      logger.warn({
        message: "No shadcn mapping found for component type",
        context: { componentType },
      });
      return [];
    }

    // Check which components need to be installed
    const toInstall = requiredComponents.filter(
      (comp) => !this.isComponentInstalled(comp)
    );

    if (toInstall.length === 0) {
      logger.info({
        message: "All required components already installed",
        context: { componentType, components: requiredComponents },
      });
      return requiredComponents;
    }

    // Install missing components
    logger.info({
      message: "Installing missing components",
      context: { componentType, components: toInstall },
    });

    for (const component of toInstall) {
      await this.installComponent(component, onProgress);
    }

    return requiredComponents;
  }

  /**
   * Get the import statement for a component
   */
  getImportStatement(componentName: string): string {
    const importMap: Record<string, string> = {
      button: `import { Button } from "@/components/ui/button"`,
      card: `import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"`,
      input: `import { Input } from "@/components/ui/input"`,
      textarea: `import { Textarea } from "@/components/ui/textarea"`,
      checkbox: `import { Checkbox } from "@/components/ui/checkbox"`,
      "radio-group": `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"`,
      select: `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"`,
      label: `import { Label } from "@/components/ui/label"`,
      alert: `import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"`,
      badge: `import { Badge } from "@/components/ui/badge"`,
      separator: `import { Separator } from "@/components/ui/separator"`,
      avatar: `import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"`,
      skeleton: `import { Skeleton } from "@/components/ui/skeleton"`,
      switch: `import { Switch } from "@/components/ui/switch"`,
      slider: `import { Slider } from "@/components/ui/slider"`,
      tabs: `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"`,
      accordion: `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"`,
      form: `import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"`,
      typography: ``, // No import needed for native HTML
    };

    return importMap[componentName] || "";
  }

  /**
   * Get all unique imports needed for a list of component types
   */
  getImportsForTypes(componentTypes: string[]): string[] {
    const allComponents = new Set<string>();

    componentTypes.forEach((type) => {
      const required = this.getRequiredComponents(type);
      required.forEach((comp) => allComponents.add(comp));
    });

    const imports = Array.from(allComponents)
      .map((comp) => this.getImportStatement(comp))
      .filter(Boolean);

    return [...new Set(imports)]; // Remove duplicates
  }

  /**
   * Map canvas component type to user-friendly name
   */
  getComponentDisplayName(componentType: string): string {
    const displayNames: Record<string, string> = {
      // Buttons
      button: "Button",
      "button-outline": "Button (Outline)",
      "button-link": "Button (Link)",
      "button-destructive": "Button (Destructive)",
      "button-ghost": "Button (Ghost)",

      // Layout & Display
      card: "Card",
      alert: "Alert",
      badge: "Badge",
      separator: "Separator",
      "divider-horizontal": "Horizontal Divider",
      "divider-vertical": "Vertical Divider",
      avatar: "Avatar",
      skeleton: "Skeleton",

      // Form Inputs
      input: "Input",
      textarea: "Textarea",
      checkbox: "Checkbox",
      radio: "Radio Group",
      select: "Select",
      switch: "Switch",
      slider: "Slider",

      // Navigation & Structure
      tabs: "Tabs",
      accordion: "Accordion",

      // Typography
      heading: "Heading",
      subheading: "Subheading",
      text: "Paragraph",
      link: "Link",
      lead: "Lead Text",
      large: "Large Text",
      small: "Small Text",
      muted: "Muted Text",

      // Complex Forms
      "login-form": "Login Form",
      "signup-form": "Signup Form",
      "contact-form": "Contact Form",
      "newsletter-form": "Newsletter Form",
    };

    return (
      displayNames[componentType] ||
      componentType.charAt(0).toUpperCase() + componentType.slice(1)
    );
  }
}
