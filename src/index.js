
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

            // listen to children only not in case of variation, for variation we make UniProt calls from here
            if(this._feature != 'variation') {
                
                this._initLoaders();
                this._addLoaderListeners();

            } else {
                
                var accessionCount = 0
                var requestProcessed = 0
                var accessionStartEndMap = {}
                let resultFeatures = []

                this.loadUniProtAccessions(this._pdbId).then(result => {

                    result = result[this._pdbId]["UniProt"]
                    console.log('Result->', result)
                    accessionCount = Object.keys(result).length
                    console.log('accessionCount', accessionCount)


                    Object.keys(result).forEach(accession => {

                        result[accession].mappings.filter(x => x.chain_id == this._bestChainId).map(x => {
                            
                            // when there are segments of UniProt accessions across PDB sequence
                            if(accessionStartEndMap[accession] == undefined) {
                                accessionStartEndMap[accession] = []
                            }
                            accessionStartEndMap[accession].push({
                                unp_start: x.unp_start,
                                unp_end: x.unp_end,
                                pdb_start: x.start.residue_number,
                                pdb_end: x.end.residue_number
                            })
                        })
                        console.log('map->', accessionStartEndMap)
                        this.loadUniProtVariationData(accession).then(variationData => {
                            
                            requestProcessed++

                            // process successful responses
                            if(variationData['errorMessage'] == undefined) {
                                
                                console.log(accession, ' before variation->',variationData)
                                console.log('requestProcessed', requestProcessed)
                                
                                console.log('len->', this._length, variationData.sequence.length)

                                // keep the longest sequence (PDB or UNP) in variation result
                                //if(this._length > variationData.sequence.length) {
                                // as of now make sequence as PDB sequence
                                variationData.sequence = document.querySelector('protvista-sequence').data
                                //}
                                

                                // transform variation to scope of PDB
                                // 1. Strip the data to unp range and shift them to pdb range
                                // 2. Shift the sequence to PDB scope
                                
                                variationData.features
                                    .forEach(x => {
                                        accessionStartEndMap[accession].forEach(y => {
                                            if(x.begin >= y.unp_start && x.begin <= y.unp_end) {
                                                x.begin = parseInt(x.begin) + (y.pdb_start - y.unp_start)
                                                resultFeatures.push(x)
                                            }
                                        })
                                    })
                                    console.log('resultfeatures->', resultFeatures)
                                                        
                                variationData.features = resultFeatures
                                
                                // return data to parent when response from all reaches
                                if(requestProcessed == accessionCount) {
                                    this.dispatchEvent(new CustomEvent(
                                        'load', {
                                            detail: {
                                                payload: variationData
                                            },
                                            bubbles: true,
                                            cancelable: true
                                        }
                                    ));
                                }
                                
                            }

                        })

                    })

                })

            }
            
        
        }

        parseEntry(data) {

            data = data[this._pdbId]
            data = Transformer.transform(data, this._feature, this._pdbId, this._entityId, parseInt(this._length), this._bestChainId)
            this._adaptedData = data
            
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

        async loadUniProtAccessions(pdbId) {

            // get all UniProt accessions for entry
            try {
                return await (await fetch(`https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/${pdbId}`)).json()
            } catch (e) {
                console.log('Error loading UniProt accessions', e)
            }

        }

        async loadUniProtVariationData(accession) {

            // get variation data for a UniProt entry
            try {
                return await (await fetch(`https://www.ebi.ac.uk/proteins/api/variation/${accession}`)).json()
            } catch (e) {
                console.log('Error loading UniProt variations', e)
            }

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