import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathRenderer = ({ text = '', className = '' }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !text) return;

        const container = containerRef.current;
        container.innerHTML = '';

        // Regex pattern để tìm các công thức LaTeX
        // $$...$$: display mode, $...$: inline mode
        const displayPattern = /\$\$(.+?)\$\$/g;
        const inlinePattern = /\$(.+?)\$/g;

        // Thay thế display math trước để tránh xung đột
        let html = text;

        // Xử lý display math ($$...$$)
        let displayMatches = [];
        html = html.replace(displayPattern, (match, formula) => {
            displayMatches.push(formula);
            return `__DISPLAY_MATH_${displayMatches.length - 1}__`;
        });

        // Xử lý inline math ($...$)
        let inlineMatches = [];
        html = html.replace(inlinePattern, (match, formula) => {
            inlineMatches.push(formula);
            return `__INLINE_MATH_${inlineMatches.length - 1}__`;
        });

        // Escape HTML entities trong text thường
        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        // Chia text thành các phần
        const parts = [];
        let lastIndex = 0;

        // Ghép lại text với các placeholder
        const fullText = html;
        const tokens = [];

        // Parse text để tách regular text và placeholders
        let currentPos = 0;
        let regex = /__DISPLAY_MATH_\d+__|__INLINE_MATH_\d+__/g;
        let match;

        while ((match = regex.exec(fullText)) !== null) {
            if (match.index > currentPos) {
                tokens.push({
                    type: 'text',
                    value: fullText.substring(currentPos, match.index)
                });
            }
            tokens.push({
                type: 'math',
                isDisplay: match[0].includes('DISPLAY'),
                index: parseInt(match[0].match(/\d+/)[0])
            });
            currentPos = match.index + match[0].length;
        }

        if (currentPos < fullText.length) {
            tokens.push({
                type: 'text',
                value: fullText.substring(currentPos)
            });
        }

        // Render tokens
        tokens.forEach(token => {
            if (token.type === 'text') {
                const textNode = document.createTextNode(token.value);
                container.appendChild(textNode);
            } else if (token.type === 'math') {
                const mathSpan = document.createElement('span');
                mathSpan.className = token.isDisplay ? 'math-display' : 'math-inline';

                const formula = token.isDisplay
                    ? displayMatches[token.index]
                    : inlineMatches[token.index];

                try {
                    katex.render(formula, mathSpan, {
                        throwOnError: false,
                        displayMode: token.isDisplay
                    });
                    container.appendChild(mathSpan);
                } catch (error) {
                    console.error('KaTeX render error:', error, formula);
                    // Fallback: render formula as plain text
                    const fallback = document.createElement('code');
                    fallback.style.color = 'red';
                    fallback.textContent = `[Math Error: ${formula}]`;
                    container.appendChild(fallback);
                }
            }
        });
    }, [text]);

    return (
        <span ref={containerRef} className={className} style={{ wordBreak: 'break-word' }} />
    );
};

export default MathRenderer;
