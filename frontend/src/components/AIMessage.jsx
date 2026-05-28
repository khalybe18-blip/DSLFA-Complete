import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Globe } from 'lucide-react';

const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group rounded-xl overflow-hidden my-6 shadow-md border border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-xs text-slate-400 border-b border-slate-700/50">
          <span className="uppercase font-semibold tracking-wider">{language}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:text-white hover:bg-slate-700/50 rounded-md transition-all flex items-center gap-1.5"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="font-medium">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <SyntaxHighlighter
          style={atomDark}
          language={language}
          PreTag="div"
          className="!m-0 !bg-[#1e1e2e] !p-4 text-sm"
          showLineNumbers={true}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono whitespace-pre-wrap" {...props}>
      {children}
    </code>
  );
};

const AIMessage = ({ content, externalSources }) => {
  // Replace [Source: XYZ] with a markdown link to [XYZ](source://XYZ) to hook into the custom link renderer
  const preprocessContent = (text) => {
    if (!text) return text;
    return text.replace(/\[Source:\s*([^\]]+)\]/g, ' [$1](source://$1) ');
  };

  const MarkdownLink = ({ href, children, ...props }) => {
    if (href?.startsWith('source://')) {
      const citationText = decodeURIComponent(href.replace('source://', ''));
      const matchedSource = externalSources?.find(s => 
        citationText.toLowerCase().includes(s.origin?.toLowerCase()) || 
        citationText.toLowerCase().includes(s.topic?.toLowerCase())
      );
      
      return (
        <a 
          href={matchedSource?.url || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-md text-[10px] uppercase font-bold border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors cursor-pointer no-underline align-middle"
          title={matchedSource?.url || 'External Source'}
        >
          <Globe size={10} /> {children}
        </a>
      );
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium" {...props}>{children}</a>;
  };

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none w-full 
      prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-100
      prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
      prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
      prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
      prose-p:leading-relaxed prose-p:mb-4
      prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
      prose-li:my-1
      prose-ul:list-disc prose-ul:pl-5
      prose-ol:list-decimal prose-ol:pl-5
      prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50/50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:rounded-r-lg
      prose-table:border-collapse prose-table:w-full prose-table:my-6 prose-table:rounded-lg prose-table:overflow-hidden prose-table:shadow-sm
      prose-th:bg-slate-100 dark:prose-th:bg-slate-800/80 prose-th:p-3 prose-th:text-left prose-th:font-semibold prose-th:text-slate-700 dark:prose-th:text-slate-300 prose-th:border prose-th:border-slate-200 dark:prose-th:border-slate-700
      prose-td:p-3 prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-700
      prose-tr:bg-white dark:prose-tr:bg-slate-800/40 even:prose-tr:bg-slate-50 even:dark:prose-tr:bg-slate-800/60
      marker:text-slate-400 dark:marker:text-slate-500"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: CodeBlock,
          a: MarkdownLink,
        }}
      >
        {preprocessContent(content)}
      </ReactMarkdown>
    </div>
  );
};

export default AIMessage;
