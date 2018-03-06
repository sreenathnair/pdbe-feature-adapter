
import Transformer from './Transformer'

const loadComponent = function () {

    class PDBeFeatureAdapter extends HTMLElement {

        constructor() {
            super()

        }

        connectedCallback() {
            
            this._feature = this.getAttribute('feature')
            this._pdbId = this.getAttribute('pdbid')
            this._entityId = this.getAttribute('entityid')
            this._length = this.getAttribute('length')
            this._bestChainId = this.getAttribute('chainid')
            this._initLoaders();
            this._addLoaderListeners();
            //console.log('Inside adapter', this._feature, this._pdbId, this._entityId, this._length)
        
        }

        parseEntry(data) {

            data = data[this._pdbId]
            data = Transformer.transform(data, this._feature, this._pdbId, this._entityId, parseInt(this._length), this._bestChainId)
           
            //console.log('inside')
            
            
            this._adaptedData = data
            //console.log('Inside parseEntry')
        }

        get adaptedData() {
            return this._adaptedData;
        }

        _initLoaders() {
            let children = this.children;
            if (this.childElementCount !== 1) {
                this.dispatchEvent(new CustomEvent(
                    'warning', {
                        detail: 'Only one loader OR adapter is allowed, the first one will be used, the others dismissed',
                        bubbles: true,
                        cancelable: true
                    }
                ));
                this._removeChildrenInList(this, children, 1, this.childElementCount);
            }
        }
    
        _removeChildrenInList(elem, list, start, end) {
            for (let i = start; (i < end) && (i < list.length); i++) {
                elem.removeChild(list[i]);
            }
        }

        _addLoaderListeners() {

            this.addEventListener('load', (e) => {
                if (e.target !== this) {
                    e.stopPropagation();
                    try {
                        if (e.detail.payload.errorMessage) {
                            throw e.detail.payload.errorMessage;
                        }
                        this.parseEntry(e.detail.payload);
                        this.dispatchEvent(new CustomEvent(
                            'load', {
                                detail: {
                                    payload: this._adaptedData
                                },
                                bubbles: true,
                                cancelable: true
                            }
                        ));
                    } catch (error) {
                        this.dispatchEvent(new CustomEvent(
                            'error', {
                                detail: error,
                                bubbles: true,
                                cancelable: true
                            }
                        ));
                    }
                }
            });
        }

    }
    customElements.define('pdbe-feature-adapter', PDBeFeatureAdapter);
};

// Conditional loading of polyfill
if (window.customElements) {
    loadComponent();
} else {
    document.addEventListener('WebComponentsReady', function () {
        loadComponent();
    });
}