import { readFile, writeFile } from 'node:fs/promises';
import { print } from 'recast';
import { parse, TSESTree, AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import Handlebars from 'handlebars';

const fileName = `${process.cwd()}/${process.argv[2]}`;

const sourceCode = await readFile(fileName, 'utf-8');

interface Member {
  type: 'function' | 'constant';
  args: string[]
  returnType: string;
  docs: string[];
}

interface Namespace {
  name: string;
  members: Map<string, Member[]>;
  docs: string[];
}

class ASTVisitor {
  docs: Namespace[] = [{
    name: ``,
    members: new Map(),
    docs: [],
  }];
  ast?: TSESTree.Program;
  lastNode: TSESTree.Node = ast;

  debug = false;

  setLastNode(n: TSESTree.Node) {
    this.lastNode = n;
  }

  getNodeComments(node: TSESTree.Node) {
    return this.ast?.comments
      ?.filter(comment => comment.range[0] >= this.lastNode.range[1] && comment.range[1] <= node.range[0])
      ?.filter(comment => comment.type === 'Block') // Only JSDoc comments, not line comments
      .map(comment => comment.value
        .replace(/( +\*|\*\n)/g, '')
        .replace(/(\@\w+)\s+(\{[^\}]+\})/g, '$1 `$2`')
        .replace(/( *\@\w+)/g, '-$1')
        .replace(/\s*-\s*@example[\s\S]*?(?=\s*-\s*@|\s*$)/g, '')
      ) ?? [];
  }
  visit(n: TSESTree.Node) {
    switch (n.type) {
      case AST_NODE_TYPES.Program: {
        this.visitProgram(n);
      } break;
    }
  }
  visitProgram(program: TSESTree.Program) {
    this.ast = program;

    for (const node of program.body) {
      this.visitProgramStatement(node);
    }
  }
  visitProgramStatement(n: TSESTree.ProgramStatement) {
    switch (n.type) {
      case AST_NODE_TYPES.ExportNamedDeclaration: {
        this.visitExportNamedDeclaration(n);
      } break;
      case AST_NODE_TYPES.ExportDefaultDeclaration: {

      } break;
      default: {
        console.error(n.type);
      };
    }
    this.setLastNode(n);
  }
  visitExportNamedDeclaration(n: TSESTree.ExportNamedDeclaration) {
    switch (n.declaration?.type) {
      case AST_NODE_TYPES.ClassDeclaration: {
        this.visitClassDeclaration(n.declaration);
      } break;
      case AST_NODE_TYPES.TSInterfaceDeclaration: {
        this.visitTSInterfaceDeclaration(n.declaration);
      } break;
      case AST_NODE_TYPES.TSTypeAliasDeclaration: {

      } break;
      case AST_NODE_TYPES.VariableDeclaration: {
        this.visitVariableDeclaration(n.declaration);
      } break;
      default: {
        console.error(n.declaration?.type);
      };
    }
  }
  visitVariableDeclaration(n: TSESTree.VariableDeclaration) {
    for (const declaration of n.declarations) {
      switch (declaration.type) {
        case AST_NODE_TYPES.VariableDeclarator: {
          this.visitVariableDeclarator(declaration);
        } break;
        default: {
          console.error(declaration.type);
        }
      }
    }
    this.setLastNode(n);
  }
  visitVariableDeclarator(n: TSESTree.VariableDeclarator) {
    let name = ``;
    switch (n.id.type) {
      case AST_NODE_TYPES.Identifier: {
        name += n.id.name;
      } break;
    }
    
    const comments = this.getNodeComments(n);
    if (comments.length === 0) {
      this.setLastNode(n);
      return;
    }
    
    this.docs[0].members.set(name, []);
    switch (n.init?.type) {
      case AST_NODE_TYPES.ArrowFunctionExpression: {
        this.docs[0].members.get(name)?.push({
          type: 'function',
          ...this.getFunctionExpressionDoc(n.init),
          docs: comments,
        })
      } break;
      case AST_NODE_TYPES.CallExpression: {
        // Handle exported constants like $keys, $values, $strict
        this.docs[0].members.get(name)?.push({
          type: 'constant',
          args: [],
          returnType: '',
          docs: comments,
        });
      } break;
    }
    this.setLastNode(n);
  }
  visitTSInterfaceDeclaration(n: TSESTree.TSInterfaceDeclaration) {
    this.setLastNode(n);
  }
  visitClassDeclaration(n: TSESTree.ClassDeclaration) {
    this.docs.push({
      name: `${n.id?.name}`,
      members: new Map(),
      docs: this.getNodeComments(n),
    });

    this.visitClassBody(n.body);
    this.setLastNode(n);
  }
  visitClassBody(n: TSESTree.ClassBody) {
    for (const member of n.body) {
      switch (member.type) {
        case AST_NODE_TYPES.PropertyDefinition: {
          this.visitPropertyDefinition(member);
        } break;
        case AST_NODE_TYPES.MethodDefinition: {
          this.visitMethodDefinition(member);
        } break;
        default: {
          this.setLastNode(member);
        }
      }
    }
    this.setLastNode(n);
  }
  visitPropertyDefinition(n: TSESTree.PropertyDefinition) {
    this.setLastNode(n);
  }

  getFunctionExpressionDoc(n: TSESTree.FunctionExpression | TSESTree.TSEmptyBodyFunctionExpression | TSESTree.ArrowFunctionExpression) {
    return {
      args: n.params.map(param => {
        try {
          return print(param).code;
        } catch (e) {
          switch (param.type) {
            case AST_NODE_TYPES.Identifier: {
              return param.name;
            }
            default: {
              return ``;
            }
          }
        }
      }),
      returnType: (() => {
        try {
          if (n.returnType) {
            return print(n.returnType).code;
          }
          return ``;
        } catch (e) {
          return ``;
        }
      })(),
    };
  }

  visitMethodDefinition(n: TSESTree.MethodDefinition) {
    let name = ``;
    switch (n.key.type) {
      case AST_NODE_TYPES.Identifier: {
        name += n.key.name;
      } break;
      case AST_NODE_TYPES.MemberExpression: {
        if (n.key.object.type === AST_NODE_TYPES.Identifier) {
          name += n.key.object.name;
        }
        if (n.key.property.type === AST_NODE_TYPES.Identifier) {
          name += `.${n.key.property.name}`;
        }
      } break;
    }
    const members = this.docs[this.docs.length - 1].members;
    if (!members.has(name)) {
      members.set(name, []);
    }
    members.get(name)?.push({
      type: 'function',
      ...this.getFunctionExpressionDoc(n.value),
      docs: this.getNodeComments(n),
    });
    this.setLastNode(n);
  }
}

const ast = parse(sourceCode, {
  comment: true,
  range: true,
  loc: true,
});
const visitor = new ASTVisitor();

visitor.visitProgram(ast);

const normalize = (name: string) => name.replace(/[\s-]+/g, '-').replace(/[^\w-]+/g, '').toLowerCase();

visitor.docs.push(visitor.docs.shift()!);

const templateData = {
  namespaces: visitor.docs.filter(doc => doc.docs.every(doc => !doc.includes('@internal'))).map(doc => ({
    name: doc.name,
    docs: doc.docs,
    members: Array.from(doc.members.entries()).filter(([, members]) => 
      members.every(member => member.docs.every(doc => !doc.includes('@internal')))
    ).map(([key, members]) => ({ key, members })),
    normalize: (name: string) => name.replace(/[\s-]+/g, '-').replace(/[^\w-]+/g, '').toLowerCase()
  })),
  normalize
};

Handlebars.registerHelper('normalize', normalize);
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('makeAnchor', (key, members) => {
  if (!members || members.length === 0) return normalize(key);
  const member = members[0];
  const title = member.type === 'function' 
    ? `${key}(${member.args ? member.args.join(', ') : ''})${member.returnType || ''}`
    : key;
  return normalize(title);
});

const templateSource = await readFile(`${process.cwd()}/docs/template.hbs`, 'utf-8');
const template = Handlebars.compile(templateSource);
const output = template(templateData);

await writeFile(`${process.cwd()}/docs/index.md`, output);