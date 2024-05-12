function init(window) {
    // uses:
    // MOUSE CLICK ANIMATION https://fdossena.com/?p=html5cool/clickfx/i.frag
    // install-mouse-helper.js https://gist.github.com/aslushnikov/94108a4094532c7752135c42e12a00eb
    // keystroke-visualizer https://github.com/fernandojsg/keystroke-visualizer/tree/master

    if (window !== window.parent)
        return;

    const DEFAULT_OPTIONS = {
        fontSize: 28,
        keyStrokeDelay: 200, // Time before the line breaks
        lingerDelay: 1000, // Time before the text fades away
        fadeDuration: 1000,
        bezelColor: '#fff',
        textColor: '#000',
        unmodifiedKey: true, // If pressing Alt+e show e, instead of €
        showSymbol: true, // Convert ArrowLeft on ->
        appendModifiers: { Meta: true, Alt: true, Shift: false }, // Append modifier to key all the time
        position: 'bottom-right' // bottom-left, bottom-right, top-left, top-right
    };

    class KeystrokeVisualizer {
        constructor() {
            this.initialized = false;
            this.container = null;
            this.style = null;
            this.keyStrokeTimeout = null;
            this.options = {};
            this.currentChunk = null;
            this.keydown = this.keydown.bind(this);
            this.keyup = this.keyup.bind(this);
        }

        cleanUp() {
            function removeNode(node) {
                if (node) {
                    node.parentNode.removeChild(node);
                }
            }
            removeNode(this.container);
            removeNode(this.style);
            clearTimeout(this.keyStrokeTimeout);
            this.currentChunk = null;
            this.container = this.style = null;

            window.removeEventListener('keydown', this.keydown, true);
            window.removeEventListener('keyup', this.keyup, true);
        }

        injectComponents() {
            // Add container
            this.container = document.createElement('ul');
            document.body.appendChild(this.container);
            this.container.className = 'keystrokes';

            const positions = {
                'bottom-left': 'bottom: 0; left: 0;',
                'bottom-right': 'bottom: 0; right: 0;',
                'top-left': 'top: 0; left: 0;',
                'top-right': 'top: 0; right: 0;',
            };

            if (!positions[this.options.position]) {
                console.warn(`Invalid position '${this.options.position}', using default 'bottom-left'. Valid positions: `, Object.keys(positions));
                this.options.position = 'bottom-left';
            }

            // Add classes
            this.style = document.createElement('style');
            this.style.innerHTML = `
      ul.keystrokes {
        all: initial;
        pointer-events: none !important;
        padding: 10px !important;
        position: fixed !important;
        z-index: 999999 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-end !important;
        ${positions[this.options.position]}
      }
      
      ul.keystrokes li {
        font-family: Arial !important;
        background-color: ${this.options.bezelColor};
        opacity: 0.9;
        color: ${this.options.textColor};
        padding: 5px 10px;
        margin-bottom: 5px;
        border-radius: 10px;
        box-shadow: 0 0 0 2px ${this.options.textColor};
        opacity: 1;
        font-size: ${this.options.fontSize}px;
        display: table;
        -webkit-transition: opacity ${this.options.fadeDuration}ms linear;
        transition: opacity ${this.options.fadeDuration}ms linear;
      }`;
            document.body.appendChild(this.style);
        }

        convertKeyToSymbol(key) {
            const conversionCommon = {
                'ArrowRight': '→',
                'ArrowLeft': '←',
                'ArrowUp': '↑',
                'ArrowDown': '↓',
                ' ': '␣',
                'Enter': '↩',
                'Shift': '⇧',
                'ShiftRight': '⇧',
                'ShiftLeft': '⇧',
                'Control': '⌃',
                'Tab': '↹',
                'CapsLock': '⇪'
            };

            const conversionMac = {
                'Alt': '⌥',
                'AltLeft': '⌥',
                'AltRight': '⌥',
                'Delete': '⌦',
                'Escape': '⎋',
                'Backspace': '⌫',
                'Meta': '⌘',
                'Tab': '⇥',
                'PageDown': '⇟',
                'PageUp': '⇞',
                'Home': '↖',
                'End': '↘'
            };

            return (navigator.platform === 'MacIntel' ? conversionMac[key] : null) || conversionCommon[key] || key;
        }

        keydown(e) {
            if (!this.currentChunk) {
                this.currentChunk = document.createElement('li');
                this.container.appendChild(this.currentChunk);
            }

            var key = e.key;
            if (this.options.unmodifiedKey) {
                if (e.code.indexOf('Key') !== -1) {
                    key = e.code.replace('Key', '');
                    if (!e.shiftKey) {
                        key = key.toLowerCase();
                    }
                }
            }

            var modifier = '';

            if (this.options.appendModifiers.Meta && e.metaKey && e.key !== 'Meta') { modifier += this.convertKeyToSymbol('Meta'); }
            if (this.options.appendModifiers.Alt && e.altKey && e.key !== 'Alt') { modifier += this.convertKeyToSymbol('Alt'); }
            if (this.options.appendModifiers.Shift && e.shiftKey && e.key !== 'Shift') { modifier += this.convertKeyToSymbol('Shift'); }
            this.currentChunk.textContent += modifier + (this.options.showSymbol ? this.convertKeyToSymbol(key) : key);
        }

        keyup(e) {
            if (!this.currentChunk) return;

            var options = this.options;

            clearTimeout(this.keyStrokeTimeout);
            this.keyStrokeTimeout = setTimeout(() => {
                (function (previousChunk) {
                    setTimeout(() => {
                        previousChunk.style.opacity = 0;
                        setTimeout(() => { previousChunk.parentNode.removeChild(previousChunk) }, options.fadeDuration);
                    }, options.lingerDelay);
                })(this.currentChunk);

                this.currentChunk = null;
            }, options.keyStrokeDelay);
        }

        enable(options) {
            this.cleanUp();
            this.options = Object.assign({}, DEFAULT_OPTIONS, options || this.options);
            this.injectComponents();
            window.addEventListener('keydown', this.keydown, true);
            window.addEventListener('keyup', this.keyup, true);
        }

        disable() {
            this.cleanUp();
        }
    }

    const KEYVIS = new KeystrokeVisualizer();
    const box = document.createElement('puppeteer-mouse-pointer');

    // click effect
    HTMLElement.prototype._originalClick = HTMLElement.prototype.click;
    // Monkey patch the click function
    HTMLElement.prototype.click = function () {
        const el = closestVisible(this);
        const bb = el.getBoundingClientRect();
        const event = {
            clientX: bb.left + bb.width / 2,
            clientY: bb.top + bb.height / 2
        }
        clickEffect(event);
        moveBox(event);
        this._originalClick.apply(this, arguments);
    };

    function closestVisible(element) {
        if (!element.checkVisibility) return element;
        if (element.checkVisibility()) return element;
        return closestVisible(element.parentElement);
    }

    function restartAnim() {
        clearTimeout(window.animT);
        window.animT = setTimeout(() => {
            box.style.removeProperty('animation');
        }, 10);
    }

    function moveBox(event) {
        box.style.left = event.clientX + 'px';
        box.style.top = event.clientY + 'px';
        box.style.animation = 'none';
        restartAnim();
    }

    function clickEffect(e) {
        var d = document.createElement("div");
        d.className = "clickEffect";
        d.style.top = e.clientY + "px"; d.style.left = e.clientX + "px";
        document.body.appendChild(d);
        d.addEventListener('animationend', function () { d.parentElement.removeChild(d); }.bind(this));
    }

    window.addEventListener('DOMContentLoaded', () => {


        KEYVIS.enable(DEFAULT_OPTIONS);


        const styleElement = document.createElement('style');
        styleElement.innerHTML = `

        div.clickEffect{
            all: initial;
            pointer-events: none !important;
            position: fixed !important;
            box-sizing: border-box !important;
            border-style: solid !important;
            border-color: white !important;
            border-radius: 50% !important;
            animation: ptrclickEffect 0.4s ease !important;
            border-width: 0.5rem !important;
            box-shadow: 0 0 0 2px rgba(0,0,0,1) !important;
            z-index: 99999 !important;
        }
        @keyframes ptrclickEffect{
            0%{
                opacity:1;
                width:0.5em; height:0.5em;
                margin:-0.25em;
            }
            100%{
                opacity:0;
                width:15em; height:15em;
                margin:-7.5em;
            }
        }

        @keyframes ptrfadeOut {
            0% {
                opacity: 1;
            }
            100% {
                opacity: 0.3;
            }
        }

        puppeteer-mouse-pointer {
          all: initial;
          pointer-events: none !important;
          position: fixed !important;
          top: 0;
          left: 0;
          z-index: 999999 !important;
          width: 30px !important;
          height: 30px !important;
          animation: ptrfadeOut 0.3s ease 3s forwards;
          background: rgba(0,0,0,.1) !important;
          border: 2px solid white !important;
          box-shadow: 0 0 0 2px rgba(0,0,0,1);
          border-radius: 100% !important;
          transform: translate(-50%, -50%);
          padding: 0 !important;
          transition: background .2s, border-radius .2s, border-color .2s !important;
        }
        puppeteer-mouse-pointer.button-1 {
          box-shadow: inset 0 0 0 2px rgba(0,0,0,1);
          transition: none !important;
          animation: none !important;
          background: rgba(255,255,255,1) !important;
        }
        puppeteer-mouse-pointer.button-2 {
          box-shadow: inset 0 0 0 2px rgba(0,0,0,1);
          transition: none !important;
          animation: none !important;
          border-color: rgba(0,0,255,1) !important;
        }
        puppeteer-mouse-pointer.button-3 {
          box-shadow: inset 0 0 0 2px rgba(0,0,0,1);
          transition: none !important;
          animation: none !important;
          border-color: rgba(0,255,0,1) !important;
        }
        puppeteer-mouse-pointer.button-4 {
          box-shadow: inset 0 0 0 2px rgba(0,0,0,1);
          transition: none !important;
          animation: none !important;
          border-color: rgba(255,0,0,1) !important;
        }
        puppeteer-mouse-pointer.button-5 {
          box-shadow: inset 0 0 0 2px rgba(0,0,0,1);
          transition: none !important;
          animation: none !important;
          border-color: rgba(0,255,0,1) !important;
        }
      `;
        document.head.appendChild(styleElement);
        document.body.appendChild(box);

        document.addEventListener('mousemove', event => {
            moveBox(event)
            updateButtons(event.buttons);
        }, true);
        document.addEventListener('mousedown', event => {
            updateButtons(event.buttons);
            clickEffect(event);
            box.classList.add('button-' + event.which);
        }, true);
        document.addEventListener('mouseup', event => {
            updateButtons(event.buttons);
            box.classList.remove('button-' + event.which);
        }, true);
        function updateButtons(buttons) {
            for (let i = 0; i < 5; i++)
                box.classList.toggle('button-' + i, buttons & (1 << i));
        }

    }, true);
}

export default async function useActionViz(page) {
    await page.evaluateOnNewDocument(`(${init.toString()})(window)`);
}