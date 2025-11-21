import fs from "fs";

export async function atomicWrite(
  filePath: string,
  content: string
): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    await fs.promises.writeFile(tempPath, content, "utf8");
    await fs.promises.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.promises.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

export async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, "utf8");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
