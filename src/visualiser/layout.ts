import cytoscape from 'cytoscape'
// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent'
cytoscape.use(coseBilkent)

export const cytoLayout: cytoscape.LayoutOptions = {
    name: 'breadthfirst',
    directed: true,
    padding: 10,
    spacingFactor: 1.75, // Adjust spacing between levels
    // concentric: function (node) {
    //     // @ts-ignore
    //     return node.data('level')
    // },
    // levelWidth: function (_) {
    //     return 5 // You can experiment with this value
    // },
    // minNodeSpacing: 70,
    // spacingFactor: 1.5,
    // fit: true, // Turn off automatic fitting
    // padding: 30,
    // animate: true,
    // animationDuration: 500,
}
