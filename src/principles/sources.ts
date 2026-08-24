import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

/**
 * Shared plumbing for the two principle tests.
 *
 * Both of them read the source text of the app and parse it with TypeScript's
 * own parser rather than with a regular expression. That matters: a regex over
 * JSX gets `{'text'}` wrong, gets a string containing a `<` wrong, and gets a
 * comment containing either wrong. These tests exist because prose does not
 * survive forty turns (decision D0.4), and a test that can be fooled is prose.
 */

export const SRC_DIR = join(import.meta.dirname, '..')

export function sourceFilesUnder(directory: string, extensions: string[]): string[] {
  let entries: string[]
  try {
    entries = readdirSync(directory, { recursive: true, encoding: 'utf8' })
  } catch {
    return []
  }
  return entries
    .filter((name) => extensions.some((extension) => name.endsWith(extension)))
    .map((name) => join(directory, name))
}

export function parse(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
}

export function label(path: string): string {
  return relative(SRC_DIR, path)
}

export function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
}

export interface ImportUse {
  readonly specifier: string
  readonly names: string[]
  readonly node: ts.Node
}

/** Every `import ... from '...'` and `export ... from '...'` in a file. */
export function importsOf(source: ts.SourceFile): ImportUse[] {
  const uses: ImportUse[] = []

  for (const statement of source.statements) {
    const clause =
      ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
        ? statement.moduleSpecifier
        : undefined
    if (clause === undefined || !ts.isStringLiteral(clause)) continue

    const names: string[] = []
    if (ts.isImportDeclaration(statement) && statement.importClause !== undefined) {
      const { name, namedBindings } = statement.importClause
      if (name !== undefined) names.push(name.text)
      if (namedBindings !== undefined) {
        if (ts.isNamedImports(namedBindings)) {
          for (const element of namedBindings.elements) {
            names.push((element.propertyName ?? element.name).text)
          }
        } else {
          names.push(namedBindings.name.text)
        }
      }
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause !== undefined) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          names.push((element.propertyName ?? element.name).text)
        }
      }
    }

    uses.push({ specifier: clause.text, names, node: statement })
  }

  return uses
}

/** Every name a module exports, however it declares it. */
export function exportedNames(path: string): string[] {
  const source = parse(path)
  const names: string[] = []

  for (const statement of source.statements) {
    const exported =
      ts.canHaveModifiers(statement) &&
      ts
        .getModifiers(statement)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true

    if (exported) {
      if (
        ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)
      ) {
        if (statement.name !== undefined) names.push(statement.name.text)
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text)
        }
      }
    }

    if (ts.isExportDeclaration(statement) && statement.exportClause !== undefined) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          names.push(element.name.text)
        }
      }
    }
  }

  return names
}
