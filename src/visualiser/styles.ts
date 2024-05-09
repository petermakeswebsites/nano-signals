import cytoscape from 'cytoscape'
import { Flag } from '../lib'

export const cytoStyle: cytoscape.Stylesheet[] = [
    {
        selector: 'node',
        style: {
            'background-color': '#666',
            label: 'data(name)',
            'text-valign': 'center',
            color: '#fff',
            shape: 'ellipse',
            'text-outline-width': 2,
            'text-outline-color': '#888',
            'font-size': 12,
        },
    },
    {
        selector: 'node[type="value"]', // this is the parent, backdrop
        style: {
            shape: 'ellipse',
            'text-valign': 'bottom',
            label: 'data(value)',
            'background-color': 'transparent',
            'background-opacity': 0,
            'border-opacity': 0,
            color: '#000',
            'overlay-padding': '0',
            'overlay-opacity': 0,
            'overlay-color': 'transparent',
            'text-outline-color': '#eee',
            'text-max-width': '150px', // Set maximum width of text (in pixels)
            'text-wrap': 'ellipsis', // Ensures text that exceeds the width ends with an ellipsis
            // 'text-overflow-wrap': 'ellipsis', // Use 'ellipsis' to prevent wrapping
            'font-size': 12,
        },
    },
    {
        selector: 'node[type="root"]',
        style: {
            'background-color': '#faa',
        },
    },
    {
        selector: 'node[type="source"]',
        style: {
            'background-color': '#faf',
        },
    },
    {
        selector: `node[state=${Flag.DIRTY}]`,
        style: {
            'text-outline-color': '#f00', // Changed for visibility
        },
    },
    {
        selector: `node[state=${Flag.MAYBE_DIRTY}]`,
        style: {
            'text-outline-color': '#f80', // Changed for visibility
        },
    },
    {
        selector: 'node[state="pending"]',
        style: {
            'text-outline-color': '#00f',
        },
    },
    // {
    //     selector: 'node[value]::after',
    //     style: {
    //         content: 'data(value)',
    //         'text-wrap': 'ellipsis',
    //         'text-max-width': '80px', // Ensures text does not exceed the node width
    //         'text-valign': 'bottom',
    //         'text-halign': 'center',
    //         color: '#ccc',
    //         'font-size': 10, // Smaller font size for the secondary label
    //         'text-margin-y': 5, // Space between the main label and secondary label
    //     },
    // },
    {
        selector: 'node[type="effect"]',
        style: {
            'background-color': '#aaf',
        },
    },
    {
        selector: 'node[type="derived"]',
        style: {
            'background-color': '#afa',
        },
    },
    {
        selector: 'node[livestatus="destroyed"]',
        style: {
            opacity: 0.3,
        },
    },
    {
        selector: 'edge',
        style: {
            width: 1,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'unbundled-bezier',
            'arrow-scale': 1,
            // 'source-arrow-shape': 'triangle',
        },
    },
    {
        selector: 'edge[type="rx"]',
        style: {
            'line-color': '#f00',
            'target-arrow-color': '#f00',
            'target-arrow-shape': 'triangle',
            'curve-style': 'unbundled-bezier',
        },
    },
    {
        selector: 'edge[type="effectrelation"]',
        style: {
            'line-color': '#0ff',
            'target-arrow-color': '#00f',
            'target-arrow-shape': 'triangle',
            'curve-style': 'unbundled-bezier',
        },
    },
    {
        selector: 'edge[type="dep"]',
        style: {
            'line-color': '#00f',
            'target-arrow-color': '#00f',
            'target-arrow-shape': 'triangle',
            'curve-style': 'unbundled-bezier',
        },
    },
]
