#!/usr/bin/env node
/**
 * scripts/checks.js
 *
 * Simple repository checks to catch common UI anti-patterns:
 *  - addEventListener without corresponding removeEventListener (heuristic)
 *  - window.addEventListener usage without obvious cleanup (heuristic)
 *  - occurrences of `innerHTML =` (heuristic threshold)
 *  - potential loops: files that mention `onChange` + `onUpdate` + `updateCharacter` (simple heuristic)
 *
 * Usage:
 *   node scripts/checks.js
 *
 * Exit code:
 *   0 - no findings above thresholds
 *   1 - findings detected (warnings/errors printed)
 *
 * This is intentionally conservative and heuristic-based — it's a helper for local dev / CI,
 * not a replacement for human review.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..'); // proyecto-arcana
const SRC = path.join(ROOT, 'src');

const JS_GLOBS = ['.js', '.mjs', '.cjs'];

function walk(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            // skip node_modules
            if (e.name === 'node_modules') continue;
            walk(full, files);
        } else if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase();
            if (JS_GLOBS.includes(ext)) files.push(full);
        }
    }
    return files;
}

function readFileSafe(p) {
    try {
        return fs.readFileSync(p, 'utf8');
    } catch (e) {
        return '';
    }
}

function countAll(regex, content) {
    const m = content.match(new RegExp(regex, 'g'));
    return m ? m.length : 0;
}

function containsAny(content, arr) {
    return arr.some((s) => content.includes(s));
}

function relative(p) {
    return path.relative(ROOT, p);
}

function runChecks() {
    console.log('Running lightweight checks on', SRC);
    if (!fs.existsSync(SRC)) {
        console.error('Source directory not found:', SRC);
        process.exit(1);
    }

    const files = walk(SRC);
    const findings = {
        addWithoutRemove: [],
        windowListenersNoCleanup: [],
        innerHTMLHeavy: [],
        possibleLoops: [],
    };

    const INNER_HTML_THRESHOLD = 2; // files with more than this many innerHTML assignments get flagged

    for (const file of files) {
        const content = readFileSafe(file);
        if (!content) continue;

        // normalize and simple stripping of strings/comments could reduce false positives,
        // but keep it simple and pragmatic for now.

        const addCount = countAll('\\.addEventListener\\s*\\(', content);
        const removeCount = countAll('\\.removeEventListener\\s*\\(', content);
        const innerHTMLCount = countAll('\\.innerHTML\\s*=\\s*', content);

        // Heuristic 1: addEventListener > removeEventListener
        if (addCount > removeCount) {
            findings.addWithoutRemove.push({
                file: relative(file),
                addCount,
                removeCount,
            });
        }

        // Heuristic 2: window.addEventListener but no obvious cleanup
        const usesWindowListener =
            content.includes('window.addEventListener(') || content.includes('document.addEventListener(');
        const hasCleanup =
            removeCount > 0 ||
            content.includes('destroy(') ||
            content.includes('.destroy') ||
            content.includes('removeEventListener(') ||
            content.includes('unsubscribe(') ||
            content.includes('removeListener(');
        if (usesWindowListener && !hasCleanup) {
            findings.windowListenersNoCleanup.push({
                file: relative(file),
                usesWindowListener,
                hint: 'Has window/document listeners with no obvious cleanup (remove/destroy).',
            });
        }

        // Heuristic 3: many innerHTML assignments in single file -> risk of big re-renders
        if (innerHTMLCount > INNER_HTML_THRESHOLD) {
            findings.innerHTMLHeavy.push({
                file: relative(file),
                innerHTMLCount,
            });
        }

        // Heuristic 4: possible onChange/onUpdate loop
        const mentionsOnChange = /onChange/.test(content);
        const mentionsOnUpdate = /onUpdate/.test(content);
        const mentionsUpdateCharacter = /updateCharacter/.test(content) || /updateDerived/.test(content);
        if (mentionsOnChange && mentionsOnUpdate && mentionsUpdateCharacter) {
            findings.possibleLoops.push({
                file: relative(file),
                hints: [
                    mentionsOnChange ? 'onChange' : null,
                    mentionsOnUpdate ? 'onUpdate' : null,
                    mentionsUpdateCharacter ? 'updateCharacter/updateDerived' : null,
                ].filter(Boolean),
            });
        }
    }

    // Summarize
    let errorCount = 0;
    function printSection(title, list) {
        if (!list || list.length === 0) return;
        console.log('');
        console.log('===', title, '(', list.length, ')', '===');
        for (const it of list) {
            console.log('-', it.file, JSON.stringify(it, null, 0));
        }
    }

    printSection('Files with addEventListener count > removeEventListener count', findings.addWithoutRemove);
    printSection('Files with window/document listeners without obvious cleanup', findings.windowListenersNoCleanup);
    printSection(`Files with more than ${INNER_HTML_THRESHOLD} innerHTML assignments`, findings.innerHTMLHeavy);
    printSection(
        'Files potentially containing onChange->onUpdate->updateCharacter loops (heuristic)',
        findings.possibleLoops
    );

    // Decide exit code: if any critical findings, exit 1
    const severe =
        findings.addWithoutRemove.length +
        findings.windowListenersNoCleanup.length +
        findings.innerHTMLHeavy.length +
        findings.possibleLoops.length;
    if (severe > 0) {
        console.warn('');
        console.warn(
            'Checks found potential issues. Review the files above. These are heuristics and may contain false positives.'
        );
        process.exitCode = 1;
    } else {
        console.log('');
        console.log('No obvious issues found by checks.');
        process.exitCode = 0;
    }
}

if (require.main === module) {
    try {
        runChecks();
    } catch (err) {
        console.error('Error running checks:', err);
        process.exit(2);
    }
}
