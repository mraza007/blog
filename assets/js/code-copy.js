document.addEventListener('DOMContentLoaded', function() {
    var langNames = {
        'python': 'Python', 'py': 'Python',
        'javascript': 'JavaScript', 'js': 'JavaScript',
        'typescript': 'TypeScript', 'ts': 'TypeScript',
        'bash': 'Bash', 'shell': 'Shell', 'sh': 'Shell', 'zsh': 'Zsh',
        'json': 'JSON', 'yaml': 'YAML', 'yml': 'YAML',
        'html': 'HTML', 'css': 'CSS', 'scss': 'SCSS',
        'sql': 'SQL', 'go': 'Go', 'rust': 'Rust', 'ruby': 'Ruby',
        'java': 'Java', 'c': 'C', 'cpp': 'C++', 'csharp': 'C#',
        'php': 'PHP', 'swift': 'Swift', 'kotlin': 'Kotlin',
        'dockerfile': 'Dockerfile', 'docker': 'Docker',
        'nginx': 'Nginx', 'terraform': 'Terraform', 'hcl': 'HCL',
        'toml': 'TOML', 'ini': 'INI', 'xml': 'XML',
        'markdown': 'Markdown', 'md': 'Markdown'
    };

    var blocks = document.querySelectorAll('div.highlighter-rouge');

    for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];

        if (block.parentNode && block.parentNode.className && block.parentNode.className.indexOf('code-wrapper') !== -1) continue;

        var pre = block.querySelector('pre');
        if (!pre) continue;

        var lang = '';
        var classes = block.className.split(' ');
        for (var j = 0; j < classes.length; j++) {
            if (classes[j].indexOf('language-') === 0) {
                var langKey = classes[j].replace('language-', '');
                if (langKey !== 'plaintext' && langKey !== 'text') {
                    lang = langNames[langKey] || langKey.charAt(0).toUpperCase() + langKey.slice(1);
                }
                break;
            }
        }

        var code = block.querySelector('code');

        var wrapper = document.createElement('div');
        wrapper.className = lang ? 'code-wrapper' : 'code-wrapper no-lang';

        block.parentNode.insertBefore(wrapper, block);

        if (lang) {
            var header = document.createElement('div');
            header.className = 'code-header';

            var langSpan = document.createElement('span');
            langSpan.className = 'code-lang';
            langSpan.textContent = lang;
            header.appendChild(langSpan);

            var copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.setAttribute('data-code', code ? code.textContent : pre.textContent);
            header.appendChild(copyBtn);

            wrapper.appendChild(header);
        } else {
            var copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.setAttribute('data-code', code ? code.textContent : pre.textContent);
            wrapper.appendChild(copyBtn);
        }

        wrapper.appendChild(block);
    }

    document.addEventListener('click', function(e) {
        if (e.target.className.indexOf('copy-btn') !== -1) {
            var btn = e.target;
            var text = btn.getAttribute('data-code');
            navigator.clipboard.writeText(text).then(function() {
                btn.textContent = 'Copied!';
                btn.classList.add('copied');
                setTimeout(function() {
                    btn.textContent = 'Copy';
                    btn.classList.remove('copied');
                }, 2000);
            });
        }
    });
});
