import { useEffect, useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
  DROP_COMMAND,
  LexicalEditor as LexicalEditorType,
  EditorState,
  $getRoot,
  DecoratorNode,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  DOMConversionMap,
  DOMConversionOutput,
} from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { useState } from "react";

// ── Custom Image Node ──────────────────────────────────────────

type SerializedImageNode = Spread<
  { src: string; altText: string; width?: number; height?: number },
  SerializedLexicalNode
>;

function $convertImageElement(domNode: Node): DOMConversionOutput | null {
  if (domNode instanceof HTMLImageElement) {
    const node = $createImageNode(domNode.src, domNode.alt);
    return { node };
  }
  return null;
}

export class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;
  __width: number | undefined;
  __height: number | undefined;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__width, node.__height, node.__key);
  }

  constructor(
    src: string,
    altText: string,
    width?: number,
    height?: number,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "lexical-image-wrapper";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.setAttribute("src", this.__src);
    img.setAttribute("alt", this.__altText);
    if (this.__width) img.setAttribute("width", String(this.__width));
    if (this.__height) img.setAttribute("height", String(this.__height));
    return { element: img };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode(
      serializedNode.src,
      serializedNode.altText,
      serializedNode.width,
      serializedNode.height,
    );
  }

  exportJSON(): SerializedImageNode {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
    };
  }

  decorate(): React.JSX.Element {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        width={this.__width}
        height={this.__height}
        style={{ maxWidth: "100%", borderRadius: "4px", margin: "8px 0" }}
        draggable={false}
      />
    );
  }
}

export function $createImageNode(
  src: string,
  altText: string,
  width?: number,
  height?: number,
): ImageNode {
  return new ImageNode(src, altText, width, height);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

// ── Image Paste Plugin ─────────────────────────────────────────

function ImagePastePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleImageFile = async (file: File) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const result = await window.api.minio.upload({
          name: file.name || `pasted-image-${Date.now()}.png`,
          mime: file.type,
          data: uint8Array,
        });
        const src = `app-file://storage/${result.objectName}`;
        editor.update(() => {
          const imageNode = $createImageNode(src, result.originalName || "image");
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([imageNode]);
          } else {
            $getRoot().append($createParagraphNode().append(imageNode));
          }
        });
      } catch (err) {
        console.error("Failed to upload image:", err);
      }
    };

    const removePaste = editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) handleImageFile(file);
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );

    const removeDrop = editor.registerCommand(
      DROP_COMMAND,
      (event: DragEvent) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (const file of Array.from(files)) {
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            handleImageFile(file);
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      removePaste();
      removeDrop();
    };
  }, [editor]);

  return null;
}

// ── HTML Sync Plugin ───────────────────────────────────────────

function HtmlInitPlugin({
  htmlContent,
  contentKey,
}: {
  htmlContent: string;
  contentKey: string;
}): null {
  const [editor] = useLexicalComposerContext();
  const [lastKey, setLastKey] = useState(contentKey);

  useEffect(() => {
    if (contentKey !== lastKey) {
      setLastKey(contentKey);
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        if (htmlContent && htmlContent.trim()) {
          const parser = new DOMParser();
          const dom = parser.parseFromString(htmlContent, "text/html");
          const nodes = $generateNodesFromDOM(editor, dom);
          root.append(...nodes);
        } else {
          root.append($createParagraphNode());
        }
      });
    }
  }, [contentKey, htmlContent, editor, lastKey]);

  return null;
}

// ── Toolbar ────────────────────────────────────────────────────

function ToolbarPlugin(): React.JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [blockType, setBlockType] = useState<string>("paragraph");

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const formats = new Set<string>();
        if (selection.hasFormat("bold")) formats.add("bold");
        if (selection.hasFormat("italic")) formats.add("italic");
        if (selection.hasFormat("underline")) formats.add("underline");
        if (selection.hasFormat("strikethrough")) formats.add("strikethrough");
        if (selection.hasFormat("code")) formats.add("code");
        setActiveFormats(formats);

        const anchorNode = selection.anchor.getNode();
        const element =
          anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElementOrThrow();
        const elementKey = element.getKey();
        const elementDOM = editor.getElementByKey(elementKey);
        if (elementDOM) {
          const tag = elementDOM.tagName.toLowerCase();
          if (tag.match(/^h[1-6]$/)) setBlockType(tag);
          else if (tag === "blockquote") setBlockType("quote");
          else if (tag === "ul") setBlockType("ul");
          else if (tag === "ol") setBlockType("ol");
          else if (tag === "pre") setBlockType("code");
          else setBlockType("paragraph");
        }
      });
    });
  }, [editor]);

  const formatText = (format: string) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format as any);
  };

  const formatBlock = (type: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (type === "h1") {
        $setBlocksType(selection, () => $createHeadingNode("h1"));
      } else if (type === "h2") {
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      } else if (type === "h3") {
        $setBlocksType(selection, () => $createHeadingNode("h3"));
      } else if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (type === "code") {
        $setBlocksType(selection, () => $createCodeNode());
      }
    });
  };

  const toggleList = (listType: "ul" | "ol") => {
    if (blockType === listType) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else if (listType === "ul") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  };

  const insertHR = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };

  const btn = (
    label: string,
    onClick: () => void,
    active = false,
    title?: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`lexical-toolbar-btn${active ? " active" : ""}`}
      title={title || label}
    >
      {label}
    </button>
  );

  return (
    <div className="lexical-toolbar">
      {btn("B", () => formatText("bold"), activeFormats.has("bold"), "Bold (Ctrl+B)")}
      {btn("I", () => formatText("italic"), activeFormats.has("italic"), "Italic (Ctrl+I)")}
      {btn("U", () => formatText("underline"), activeFormats.has("underline"), "Underline (Ctrl+U)")}
      {btn("S", () => formatText("strikethrough"), activeFormats.has("strikethrough"), "Strikethrough")}
      {btn("Cd", () => formatText("code"), activeFormats.has("code"), "Inline Code")}
      <span className="lexical-toolbar-divider" />
      {btn("H1", () => formatBlock("h1"), blockType === "h1", "Heading 1")}
      {btn("H2", () => formatBlock("h2"), blockType === "h2", "Heading 2")}
      {btn("H3", () => formatBlock("h3"), blockType === "h3", "Heading 3")}
      {btn("P", () => formatBlock("paragraph"), blockType === "paragraph", "Paragraph")}
      <span className="lexical-toolbar-divider" />
      {btn("UL", () => toggleList("ul"), blockType === "ul", "Bullet List")}
      {btn("OL", () => toggleList("ol"), blockType === "ol", "Numbered List")}
      {btn("BQ", () => formatBlock("quote"), blockType === "quote", "Blockquote")}
      {btn("CB", () => formatBlock("code"), blockType === "code", "Code Block")}
      <span className="lexical-toolbar-divider" />
      {btn("HR", insertHR, false, "Horizontal Rule")}
      {btn("Lk", insertLink, false, "Insert Link")}
    </div>
  );
}

// ── Main Editor Component ──────────────────────────────────────

interface LexicalEditorProps {
  content: string;
  contentKey: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
}

const theme = {
  paragraph: "lexical-paragraph",
  heading: {
    h1: "lexical-h1",
    h2: "lexical-h2",
    h3: "lexical-h3",
    h4: "lexical-h4",
    h5: "lexical-h5",
    h6: "lexical-h6",
  },
  list: {
    ul: "lexical-ul",
    ol: "lexical-ol",
    listitem: "lexical-li",
    nested: { listitem: "lexical-li-nested" },
  },
  quote: "lexical-quote",
  code: "lexical-code",
  codeHighlight: {},
  link: "lexical-link",
  text: {
    bold: "lexical-bold",
    italic: "lexical-italic",
    underline: "lexical-underline",
    strikethrough: "lexical-strikethrough",
    code: "lexical-inline-code",
  },
  image: "lexical-image",
};

export function LexicalEditorComponent({
  content,
  contentKey,
  onUpdate,
  placeholder = "Start writing...",
}: LexicalEditorProps): React.JSX.Element {
  const initialConfig = {
    namespace: "NotesEditor",
    theme,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      CodeNode,
      CodeHighlightNode,
      HorizontalRuleNode,
      ImageNode,
    ],
    onError: (error: Error) => {
      console.error("Lexical error:", error);
    },
    editorState: (editor: LexicalEditorType) => {
      if (content && content.trim()) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(content, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.append(...nodes);
      }
    },
  };

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditorType) => {
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor);
        onUpdate(html);
      });
    },
    [onUpdate],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="lexical-editor-container">
        <ToolbarPlugin />
        <div className="lexical-editor-wrapper">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="lexical-content-editable" />
            }
            placeholder={
              <div className="lexical-placeholder">{placeholder}</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <ImagePastePlugin />
        <HtmlInitPlugin htmlContent={content} contentKey={contentKey} />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
