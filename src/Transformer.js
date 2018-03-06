import {
    color_code, 
    dom_keys
} from './config'

export default class Transformer {

    constructor() {}
    
    static transform(data, feature, pdbId, entityId, length, bestChainId) {

        switch (feature) {
            case 'molecule':
                return Transformer.transformMolecule(data, pdbId, entityId, length)
            case 'modified':
                return Transformer.transformModified(data, pdbId, entityId, length)
            case 'mutated':
                return Transformer.transformMutated(data, pdbId, entityId, length)
            case 'cath':
            case 'scop':
            case 'uniprot':
            case 'pfam':
            case 'rfam':
                return Transformer.transformDomains(feature, data, pdbId, entityId, length, bestChainId)
            case 'helix':
            case 'strand':
                return Transformer.transformSecStructures(feature, data, pdbId, entityId, length, bestChainId)
            case 'ligand':
            case 'site_residues':
                return Transformer.transformBindingSites(feature, data, pdbId, entityId, length, bestChainId)
            case 'rsrz':
            case 'rc_outliers':
            case 'sidechain_outliers':
            case 'clashes':
                return Transformer.transformQuality(feature, data, pdbId, entityId, length, bestChainId)
            case 'quality':
            return Transformer.transformQualitySummary(feature, data, pdbId, entityId, length, bestChainId)
        }
    }

    static transformMolecule(data, pdbId, entityId, length) {
        
    
        let moleculeData = [{
            accession: "molecule", locations: [{
                fragments: []
            }], color: color_code["molecule"]
        }]

        data.filter(x => (x.entity_id && x.entity_id == entityId))
            .forEach(element => {

                let fragment = {
                    start: 1,
                    end: length,
                    toolTip: "Residue {resNum} ({charAtResNum})<br>" +
                        "<b>" + pdbId + "</b>"
                };

                moleculeData[0].locations[0].fragments.push(fragment);
            })

        return moleculeData
    }

    static transformModified(data, pdbId, entityId, length) {
    
        let moleculeData = [{
            accession: "modified", locations: [{
                fragments: []
            }], color: color_code["modified"]
        }]
        
        data.filter(x => (x.entity_id && x.entity_id == entityId))
            .forEach(element => {

                let fragment = {
                    start: element.author_residue_number,
                    end: element.author_residue_number,
                    toolTip: "Modified Residue: " + element.chem_comp_id
                };

                moleculeData[0].locations[0].fragments.push(fragment);
            })

        return moleculeData
    }

    static transformMutated(data, pdbId, entityId, length) {
    
        let moleculeData = [{
            accession: "mutated", locations: [{
                fragments: []
            }], color: color_code["mutated"]
        }]

        data.filter(x => (x.entity_id && x.entity_id == entityId))
            .forEach(element => {

                let fragment = {
                    start: element.author_residue_number,
                    end: element.author_residue_number,
                    toolTip: element.mutation_details.from + " --> " + element.mutation_details.to +
                    " (" + element.mutation_details.type + ")"
                };

                moleculeData[0].locations[0].fragments.push(fragment);
            })

        return moleculeData
    }

    static transformDomains(feature, data, pdbId, entityId, length, bestChainId) {

        //console.log('feature->', feature, data, bestChainId)
        let finalResult = [];
        //console.log('data->', data)
        let result = data[dom_keys[feature]]
        //console.log('result->', result)
        Object.keys(result).forEach(domain => {


            let filtered = result[domain].mappings.filter(x => x.chain_id === bestChainId);
            //let filtered = result[domain].mappings.map(x => x);
            //console.log('filtered->', filtered)
            if (filtered.length != 0) {

                //console.log('filtered.length != 0')
                let feature_data = {
                    accession: result[domain].identifier,
                    locations: [{
                        fragments: []
                    }],
                    color: color_code[feature]

                }

                filtered.forEach(dom => {

                    let uniprotTooltip = "";

                    // add UniProt details to tool tip if applicable
                    if (feature === 'uniprot') {
                        uniprotTooltip = "UniProt range: " + dom.unp_start + " - " + dom.unp_end + "<br>";
                        //this._uniProtAccessions.push(domain)
                    }

                    let fragment = {
                        start: dom.start.residue_number,
                        end: dom.end.residue_number,
                        toolTip: "Residue {resNum}  ({charAtResNum})" +
                            "<br><b>" + domain + "</b><br>" +
                            result[domain].identifier + "<br>" +
                            uniprotTooltip +
                            "PDB range: " + dom.start.residue_number + " - " +
                            dom.end.residue_number + " (Chain " + dom.chain_id + ")"
                    }

                    feature_data.locations[0].fragments.push(fragment);

                });
                finalResult.push(feature_data);
            }

        });
        //console.log('finalResult->', finalResult)
        return finalResult;

    }

    static transformSecStructures(feature, data, pdbId, entityId, length, bestChainId) {

        //console.log('sec structures->', feature)
        let finalResult = [{
            accession: feature,
            locations: [{
                fragments: []
            }],
            color: color_code[feature],
        }];

        let result = data["molecules"];
        //console.log('result->', result)
        
        
        result.filter(x => x.entity_id == entityId)
            .map(x => x.chains)
            .map(x => x.filter(x => x.chain_id === bestChainId))
            .forEach(x => {

                x.forEach(element => {

                    if (element.secondary_structure[dom_keys[feature]] != undefined) {
                        
                        element.secondary_structure[dom_keys[feature]].forEach(structure => {

                            let fragment = {
                                start: structure.start.residue_number,
                                end: structure.end.residue_number,
                                toolTip: "A " + feature + " in Chain " +element.chain_id
                            };

                            finalResult[0].locations[0].fragments.push(fragment);

                        });
                    }
                });
            });
        
        //console.log('data->', finalResult)
        return finalResult;
    }

    static transformBindingSites(feature, data, pdbId, entityId, length, bestChainId) {

        if(data != undefined && data == 0) {
            return [];
        }

        let data_feature = [{
            accession: feature,
            locations:[{
                fragments: []
            }],
            color: color_code[feature],
            shape: "triangle"
        }];

        data
            .map(x => x[dom_keys[feature]])
            .reduce((a, b) => a.concat(b))
            .filter(x => (x.entity_id && x.entity_id == entityId))
            .filter(x => (x.chain_id && x.chain_id == bestChainId))
            .forEach(site => {

                let fragment = {
                    start: site.residue_number,
                    end: site.residue_number,
                    toolTip: "Residue {resNum} ({charAtResNum}) is in binding site"
                };

                data_feature[0].locations[0].fragments.push(fragment);
            });

        return data_feature;

    }

    static transformQuality(feature, data, pdbId, entityId, length, bestChainId) {
        //console.log('quality feature->', feature)
        let qualityTracks = [];
        //console.log('quality chain->', bestChainId)

        if(data == undefined) {
            return  qualityTracks;
        }

        let result = data["molecules"];

        //console.log('result->', result)

        let outlierDataHash = {};

        result.filter(x => x.entity_id == entityId)
            .map(x => x.chains)
            .map(x => x.filter(x => x.chain_id === bestChainId))
            .map(x => x.filter(x => x)
                .map(x => x.models)
            )
            .forEach(x => {
                x.forEach(x => {
                    x.map(x => x.residues)
                        .forEach(x => {
                            x.forEach(outlierResidue => { // each outlier
                                //console.log(outlierResidue)

                                if(outlierResidue.outlier_types.includes(feature)) {
                                    outlierDataHash[outlierResidue.residue_number] = feature; // set the hash if selected outlier type is present for a particular residue
                                }
                            })
                        })
                })
            });


        // process outlier result and create tracks data to display

        for (let incr = 1; incr <= length; incr++) {

            let feature = {};

            if (outlierDataHash[incr] == undefined) {
                feature = {
                    accession: "quality-0", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            //toolTip: "No validation issue reported for Residue " + incr + " (" +this._compObj._pdbSequence.charAt(incr - 1) +")"
                            toolTip: "No validation issue reported for Residue " + incr +" ({charAtResNum})"
                        }]
                    }],
                    color: color_code["quality-0"]
                };

            } else {
                feature = {
                    accession: "quality-1", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr] +
                                "<br>" + "Residue " + incr +" ({charAtResNum})"
                            //type: this._component.key // this is used to store type of outlier for summary track to process faster
                        }]
                    }],
                    color: color_code["quality-1"]
                };
            } 
            
            qualityTracks.push(feature)
            
        }

        return qualityTracks;

    }

    static transformQualitySummary(feature, data, pdbId, entityId, length, bestChainId) {


        console.log('quality summary->', feature)
        let qualityTracks = [];
        //console.log('quality chain->', bestChainId)

        if(data == undefined) {
            return  qualityTracks;
        }

        let result = data["molecules"];

        console.log('result->', result)

        let outlierDataHash = {};

        result.filter(x => x.entity_id == entityId)
            .map(x => x.chains)
            .map(x => x.filter(x => x.chain_id === bestChainId))
            .map(x => x.filter(x => x)
                .map(x => x.models)
            )
            .forEach(x => {
                x.forEach(x => {
                    x.map(x => x.residues)
                        .forEach(x => {
                            x.forEach(outlierResidue => { // each outlier
                                outlierDataHash[outlierResidue.residue_number] = outlierResidue.outlier_types; // set the hash if selected outlier type is present for a particular residue
                            })
                        })
                })
            });


        // process outlier result and create tracks data to display

        for (let incr = 1; incr <= length; incr++) {

            let feature = {};

            if (outlierDataHash[incr] == undefined) {
                feature = {
                    accession: "quality-0", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "No validation issue reported for Residue " + incr + " ({charAtResNum})"
                        }]
                    }],
                    color: color_code["quality-0"]
                };

            } else if (outlierDataHash[incr].length == 1) {
                feature = {
                    accession: "quality-1", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr] +
                                "<br>" + "Residue " + incr + " ({charAtResNum})"
                        }]
                    }],
                    color: color_code["quality-1"]
                };
            } else if (outlierDataHash[incr].length == 2) {
                feature = {
                    accession: "quality-2", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr].join(', ') +
                                "<br>" + "Residue " + incr + " ({charAtResNum})"
                        }]
                    }],
                    color: color_code["quality-2"]
                };
            } else {
                feature = {
                    accession: "quality-3", locations: [{
                        fragments: [{
                            start: incr,
                            end: incr,
                            toolTip: "Validation issue: " + outlierDataHash[incr].join(', ') +
                                "<br>" + "Residue " + incr + " ({charAtResNum})"
                        }]
                    }],
                    color: color_code["quality-3"]
                };
            }
            
            qualityTracks.push(feature)

        }

        return qualityTracks;

    }

}