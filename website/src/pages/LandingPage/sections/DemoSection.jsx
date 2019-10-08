import React from "react";
import classNames from "classnames";

// @material-ui/core components
import withStyles from "@material-ui/core/styles/withStyles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import Switch from "@material-ui/core/Switch";
import Tooltip from "@material-ui/core/Tooltip";
import Button from '@material-ui/core/Button';

// @material-ui/icons
import ViewSourceIcon from "@material-ui/icons/Code";

// Syntax highlighter
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import prism from 'react-syntax-highlighter/dist/esm/styles/prism/prism';

// Nodal elements
import {
  StructuredStorage,
  StagedLayout,
  BasicOptimizer,
  EnergyOptimizer,
  BooleanScheduler,
  fromSchema,
  generateSpringForces,
  generateCompactnessForces,
  generateNodeChildrenConstraints,
  generateNodeAlignmentConstraints,
  constrainNodeOffset,
  generateNodePortConstraints,
  constrainNodeNonoverlap,
  nudgeAngle,
} from 'nodal';

import GridContainer from "components/Grid/GridContainer.jsx";
import GridItem from "components/Grid/GridItem.jsx";
import { Graph } from "components/Graph.jsx";

import { title, darkGrayColor, primaryColor, infoColor } from "assets/jss/material-kit-react.jsx";
import tooltipsStyle from "assets/jss/material-kit-react/tooltipsStyle.jsx";

import {
  kNodesSimple,
  kNodesCompound,
  kEdgesSimple,
  kEdgesNoCompound,
  kEdgesCompound,
  kAlignments,
} from "assets/js/demo-data";

SyntaxHighlighter.registerLanguage('typescript', typescript);

class _SwitchOption extends React.Component {
    render() {
        const { classes, checked, onChange, label, tooltip, disabled } = this.props;
        return (
            <div>
                <FormControlLabel
                    control={
                        <Switch
                            checked={checked}
                            onChange={onChange}
                            disabled={disabled}
                            color="primary"
                        />
                    }
                    label={
                        <Tooltip
                            title={tooltip || ""}
                            placement="right"
                            classes={{ tooltip: classNames(classes.tooltip, classes.align), popper: classes.popper }}
                        ><span>{label}</span>
                        </Tooltip>
                    } />
              </div>
        )
    }
}
const SwitchOption = withStyles({
    ...tooltipsStyle,
    align: {
      textAlign: 'left',
    }
})(_SwitchOption);

class _RadioOption extends React.Component {
    render() {
        const { classes, checked, onChange, label, value, tooltip, disabled } = this.props;
        return (
            <FormControlLabel
                control={
                    <Radio
                        checked={checked}
                        onChange={onChange}
                        name={value}
                        disabled={disabled}
                        color="primary"
                    />
                }
                label={
                    <Tooltip
                        title={tooltip || ""}
                        placement="right"
                        classes={{ tooltip: classNames(classes.tooltip, classes.align), popper: classes.popper }}
                    ><span>{label}</span>
                    </Tooltip>
                }
            />
        );
    }
}
const RadioOption = withStyles({
    ...tooltipsStyle,
    align: {
      textAlign: 'left',
    }
})(_RadioOption);

const kIdealLength = 20;
const kFlowSeparation = 30;
const kCompactness = 0;
const kNodePadding = 0;

class DemoSection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        animated: false,
        nodeChildren: true,
        nodeShape: true,
        nodePorts: true,
        edgeOrientation: true,
        edgeVariableLength: false,
        edgeRouting: false,
        edgeRoutingShape: 'linear',  // 'linear' | 'curved' | 'octilinear
        constraintsFlow: true,
        constraintsFlowDirection: 'multiple', // 'single' | 'multiple'
        constraintsNonoverlap: true,
        constraintsAlignment: true,
        constraintsCircular: false,
        constraintsGrid: false,
        viewSource: true,
        layout: null,
    };
    const { layout, nodeSchemas, edgeSchemas } = this._buildLayout();
    this.state.layout = layout;
    this.state.nodeSchemas = nodeSchemas;
    this.state.edgeSchemas = edgeSchemas;
  }

  static _watchedState = ['animated', 'nodeChildren', 'nodeShape', 'nodePorts', 'edgeOrientation', 'edgeVariableLength', 'edgeRouting', 'constraintsFlow', 'constraintsFlowDirection', 'constraintsNonoverlap', 'constraintsAlignment', 'constraintsCircular', 'constraintsGrid'];

  _watchedStateChanged(prevState) {
    for(let key of DemoSection._watchedState) {
      if(this.state[key] !== prevState[key]) {
        return true;
      }
    }
    return false;
  }

  componentDidUpdate(prevProps, prevState) {
    if(this._watchedStateChanged(prevState)) {
      this.setState(this._buildLayout());
    }
  }

  _buildLayout() {
    // Change dataset depending on configuration.
    const { nodeChildren, nodeShape, nodePorts } = this.state;
    let nodeSchemas = [
      ...kNodesSimple,
      ...(nodeChildren ? kNodesCompound : []),
    ].map((node) => ({
      ...node,
      ...(nodePorts ? {} : { ports: undefined }),
      // ...(nodeShape ? {} : node.shape.type === "circle" ? {} : {}),
    }));
    let edgeSchemas = [
      ...kEdgesSimple,
      ...(nodeChildren ? kEdgesCompound : kEdgesNoCompound)
    ].map((edge) => ({
      ...edge,
      source: nodePorts ? edge.source : { id: edge.source.id },
      target: nodePorts ? edge.target : { id: edge.target.id },
    }));
    const { nodes, edges } = fromSchema(nodeSchemas, edgeSchemas);
    const storage = new StructuredStorage(nodes, edges);
    const shortestPath = storage.shortestPaths();
    const alignments = kAlignments;

    // Enable constraints depending on configuration.
    const { edgeOrientation, edgeVariableLength, edgeRouting, constraintsFlow, constraintsFlowDirection, constraintsNonoverlap, constraintsAlignment, constraintsCircular, constraintsGrid } = this.state;
    const nonoverlapScheduler = new BooleanScheduler(true).for(50, false)
    const flowScheduler = new BooleanScheduler(true).for(50, false);
    const alignmentScheduler = new BooleanScheduler(true).for(50, false);
    const orientationScheduler = new BooleanScheduler(true).for(75, false);
    const layout = new StagedLayout(
      storage,
      { steps: 200 },
      {
        iterations: 1,
        // optimizer: new EnergyOptimizer({ lrInitial: 0.3, lrMax: 0.5, lrMin: 0.01, wait: 20, decay: 0.9, growth: 1.1, smoothing: 0.5 }),
        optimizer: new BasicOptimizer(0.5),
        generator: function* (storage, step) {
          yield* generateSpringForces(
              storage,
              kIdealLength,
              shortestPath,
          );
          yield* generateCompactnessForces(storage, kCompactness);
          
          if(edgeOrientation && orientationScheduler.get(step)) {
              for(let edge of storage.edges()) {
                yield nudgeAngle(edge.source.node.center, edge.target.node.center, [0, 45, 90, 135, 180, 225, 270, 315], 100);
              }
          }
        },
      },
      {
        iterations: 5,
        optimizer: new BasicOptimizer(),
        generator: function* (storage, step) {
          for (let u of storage.nodes()) {
            if(constraintsNonoverlap && nonoverlapScheduler.get(step)) {
                for(let sibling of storage.siblings(u)) {
                    yield constrainNodeNonoverlap(u, sibling);
                }
            }
            if(constraintsFlow && flowScheduler.get(step)) {
              if(constraintsFlowDirection === 'single') {
                for (let e of storage.edges()) {
                  if (!storage.hasAncestor(e.source.node, e.target.node) && !storage.hasAncestor(e.target.node, e.source.node)) {
                    yield constrainNodeOffset(e.source.node, e.target.node, ">=", kFlowSeparation, [0, 1], { masses: [e.source.node.fixed ? 1e9 : 1, e.target.node.fixed ? 1e9 : 1] });
                  }
                }
              } else if (constraintsFlowDirection === 'multiple') {
                for (let e of storage.edges()) {
                  if (!storage.hasAncestor(e.source.node, e.target.node) && !storage.hasAncestor(e.target.node, e.source.node)) {
                    yield constrainNodeOffset(e.source.node, e.target.node, ">=", kFlowSeparation, e.meta && e.meta.flow === "east" ? [1, 0] : [0, 1], { masses: [e.source.node.fixed ? 1e9 : 1, e.target.node.fixed ? 1e9 : 1] });
                  }
                }
              }
            }
            if(constraintsAlignment && alignmentScheduler.get(step)) {
              for(let { ids, axis } of alignments) {
                yield* generateNodeAlignmentConstraints(ids.map((id) => storage.node(id)), axis);
              }
            }
            
            yield* generateNodeChildrenConstraints(u, kNodePadding);
            yield* generateNodePortConstraints(u);
        }
        },
      }
    );

    return { layout, nodeSchemas, edgeSchemas };
  }

  render() {
    const { classes } = this.props;

    let dataString = 
`import { NodeSchema, EdgeSchema } from 'nodal';

// A 'NodeSchema'/'EdgeSchema' is a lightweight
// object transforms into a full 'Node'/'Edge'.
const nodeSchemas: NodeSchema[] = [${
  JSON.stringify(this.state.nodeSchemas)
  .replace(/{"id":/g, '\n  { "id":')
  .replace(/,/g, ", ")
  .replace(/:/g, ": ")
  // .replace(/"id"/g, 'id')
  // .replace(/"shape"/g, 'shape')
  // .replace(/"type"/g, ' type')
  // .replace(/"width"/g, 'width')
  // .replace(/"height"/g, 'height')
  // .replace(/"radius"/g, 'radius')
  // .replace(/"ports"/g, 'ports')
  // .replace(/"location"/g, ' location')
  // .replace(/"children"/g, 'children')
  .slice(1, -1)}
];
const edgeSchemas: EdgeSchema[] = [${
  JSON.stringify(this.state.edgeSchemas)
  .replace(/{"id":"e/g, '\n  { "id":"e')
  .replace(/,/g, ", ")
  .replace(/:/g, ": ")
  // .replace(/"id"/g, 'id')
  // .replace(/"source"/g, 'source')
  // .replace(/"target"/g, 'target')
  // .replace(/"meta"/g, 'meta')
  // .replace(/"port"/g, 'port')
  // .replace(/"flow"/g, 'flow')
  .slice(1, -1)}
];`;

    let codeString =
`import {
  fromSchema,
  StructuredStorage,
  StagedLayout,
  BasicOptimizer,
  EnergyOptimizer,
} from 'nodal';

// Unspecified properties are filled in with sensible defaults,
// e.g. random initalization of node positions.
const { nodes, edges } = fromSchema(nodeSchemas, edgeSchemas)

// A 'Storage' allows easy and efficient lookup, iteration, and
// traversal over graph elements.
const storage = new StructuredStorage(nodes, edges);
const shortestPath = storage.shortestPaths();
${[
  this.state.edgeOrientation || this.state.constraintsFlow ||  this.state.constraintsNonoverlap || this.state.constraintsAlignment ? "\n// A 'Scheduler' sets a boolean/numeric value over time." : "",
  this.state.edgeOrientation ? "const orientationScheduler = new BooleanScheduler(true).for(75, false);" : "",
  this.state.constraintsFlow ? "const flowScheduler = new BooleanScheduler(true).for(50, false);" : "",
  this.state.constraintsNonoverlap ? "const nonoverlapScheduler = new BooleanScheduler(true).for(50, false);" : "",
  this.state.constraintsAlignment ? "const alignmentScheduler = new BooleanScheduler(true).for(50, false);" : "",
  " ",
].filter((str) => str).join("\n")}
// A 'Layout' performs the graph layout procedure on 'start()',
// e.g. a 'StagedLayout' procedure is broken up into different
// stages, each repeating some number of iterations.
const layout = new StagedLayout(
  storage,
  { steps: 200 },
  { // 'Force' stage that nudges elements around.
    iterations: 1,
    optimizer: new BasicOptimizer(0.5),
    fn: function* (storage, step, iter) {
      
      // Spring model attempts to reach ideal distance between
      // nodes based on shortest path length.
      yield* generateSpringForces(
        storage,
        kIdealLength,
        shortestPath,
      );
      ${!this.state.edgeOrientation ? `` : `
      // Snap edge angles to the closest of the given values.
      if(orientationScheduler.get(step)) {
        for(let edge of storage.edges()) {
          yield nudgeAngle(
            edge.source.node.center,
            edge.target.node.center,
            [0, 45, 90, 135, 180, 225, 270, 315],
            kOrientationStrength,
          );
        }
      }
      `}
    },
  },
  { // 'Constraint' stage that satisfies constraints.
    iterations: 5,
    optimizer: new BasicOptimizer(),
    fn: function* (storage, step, iter) {
      ${!this.state.constraintsFlow ? `` : `
      // Ensure edges flow in a particular direction.
      if(flowScheduler.get(step)) {
        for (let e of storage.edges()) {
          if (!storage.hasAncestor(e.source.node, e.target.node) &&
              !storage.hasAncestor(e.target.node, e.source.node)) {
            yield constrainNodeOffset(
              e.source.node, e.target.node, ">=", kFlowSeparation,
              e.meta && e.meta.flow === "east" ? [1, 0] : [0, 1],
            );
          }
        }
      }
      `} ${!this.state.constraintsNonoverlap ? `` : `
      // Ensure boundaries of nodes do not overlap.
      if(nonoverlapScheduler.get(step)) {
        for (let u of storage.nodes()) {
          for(let sibling of storage.siblings(u)) {
              yield constrainNodeNonoverlap(u, sibling);
          }
        }
      }
      `} ${!this.state.constraintsAlignment ? `` : `
      // Ensure specified nodes are aligned along the given axis.
      if(alignmentScheduler.get(step)) {
        for(let { ids, axis } of alignments) {
          yield* generateNodeAlignmentConstraints(
            ids.map((id) => storage.node(id)), axis,
          );
        }
      }
      `}
      // Ensure nodes contain their children and that ports are
      // placed on the correct location of the boundary.
      for (let u of storage.nodes()) {
        yield* generateNodeChildrenConstraints(u, kNodePadding);
        yield* generateNodePortConstraints(u);
      }

    },
  },
);
layout.start();

// Useful info (e.g. node positions/sizes) is accessed with
// 'storage.nodes()', 'storage.edges()', 'storage.bounds()', etc.
`;

    return (
      <div className={classes.section}>
        <GridContainer justify="center">
          <GridItem xs={12} sm={12} md={12}>
            <h2 className={classes.title}>Interactive Demo</h2>
            <h5>
              Try different configurations. Drag nodes around. View the code and data.
            </h5>
          </GridItem>
        </GridContainer>
        <GridContainer className={classes.demo} justify="center">
          <GridItem xs={12} sm={6} md={3}>
                
              <div><h6>Nodes</h6></div>
              <SwitchOption
                checked={this.state.nodeChildren}
                onChange={(e) => this.setState({ nodeChildren: e.target.checked })}
                label="Compound nodes"
                tooltip="Enable nodes to contain other nodes within them. Any node with a non-empty children array is a compound node."
                />
              <SwitchOption
                checked={this.state.nodeShape}
                onChange={(e) => this.setState({ nodeShape: e.target.checked })}
                label="Different shapes"
                tooltip="Enable nodes to have different boundary shapes. Demo: rectangle, circle, diamond."
                />
              <SwitchOption
                checked={this.state.nodePorts}
                onChange={(e) => this.setState({ nodePorts: e.target.checked })}
                label="Named ports"
                tooltip="Enable nodes with ports, i.e. named points on a node's boundary that edges can connect to. Optionally, they can be constrained to a particular location (e.g. 'north') and/or be sorted in a particular order."
                />

              <div><h6>Edges</h6></div>
              <SwitchOption
                checked={this.state.edgeOrientation}
                onChange={(e) => this.setState({ edgeOrientation: e.target.checked })}
                label="Angle snap"
                tooltip="Enable forces that try to orient edges at specified angles. Demo: 0, 45, 90."
                />
              {/* <SwitchOption
                checked={this.state.edgeVariableLength}
                onChange={(e) => this.setState({ edgeVariableLength: e.target.checked })}
                label="Variable length"
                tooltip="Enable different preferred lengths for edges. Demo: Jaccard scaling."
                /> */}
              {/* <SwitchOption
                checked={this.state.edgeRouting}
                onChange={(e) => this.setState({ edgeRouting: e.target.checked })}
                label="Orthogonal routing"
                tooltip="Enable postprocessing of edges to allow only vertical and horizontal segments. The resulting edges can be displayed in a variety of styles that use the same control points."
                />
                 <GridContainer className={classes.suboptions} wrap="wrap">
                 <GridItem xs={4}>
                    <RadioOption
                      disabled={!this.state.edgeRouting}
                      checked={this.state.edgeRoutingShape === "linear"}
                      onChange={(e) => this.setState({ edgeRoutingShape: "linear" })}
                      label="Linear"
                      value="linear"
                      />
                  </GridItem>
                  <GridItem xs={4}>
                  <RadioOption
                        disabled={!this.state.edgeRouting}
                        checked={this.state.edgeRoutingShape === "curved"}
                        onChange={(e) => this.setState({ edgeRoutingShape: "curved"  })}
                        label="Curved"
                        value="curved"
                        />
                  </GridItem>
                  <GridItem xs={4}>
                  <RadioOption
                        disabled={!this.state.edgeRouting}
                        checked={this.state.edgeRoutingShape === "octilinear"}
                        onChange={(e) => this.setState({ edgeRoutingShape: "octilinear"  })}
                        label="Octilinear"
                        value="octilinear"
                        />
                  </GridItem>
                 </GridContainer> */}
              
              <div><h6>Constraints</h6></div>
              <SwitchOption
                checked={this.state.constraintsFlow}
                onChange={(e) => this.setState({ constraintsFlow: e.target.checked })}
                label="Flow direction"
                tooltip="Enable constraints to make edges flow in a particular direction. Different parts of the graph may flow in different directions."
                />
                {/* <GridContainer className={classes.suboptions}>
                  <GridItem xs={4}>
                  <RadioOption
                    disabled={!this.state.constraintsFlow}
                    checked={this.state.constraintsFlowDirection === "single"}
                    onChange={(e) => this.setState({ constraintsFlowDirection: "single" })}
                    label="Single"
                    value="single"
                    />
                  </GridItem>
                  <GridItem xs={4}>
                  <RadioOption
                      disabled={!this.state.constraintsFlow}
                      checked={this.state.constraintsFlowDirection === "multiple"}
                      onChange={(e) => this.setState({ constraintsFlowDirection: "multiple"  })}
                      label="Multiple"
                      value="multiple"
                      />
                  </GridItem>
                </GridContainer> */}
              <SwitchOption
                checked={this.state.constraintsNonoverlap}
                onChange={(e) => this.setState({ constraintsNonoverlap: e.target.checked })}
                label="Non-overlap"
                tooltip="Enable constraints that ensure nodes do not overlap each other (besides compound nodes and their descendants)."
                />
              <SwitchOption
                checked={this.state.constraintsAlignment}
                onChange={(e) => this.setState({ constraintsAlignment: e.target.checked })}
                label="Alignment"
                tooltip="Enable constraints that align certain nodes with each other along specified directions. Demo: align by centers along 0 and 90."
                />
              {/* <SwitchOption
                checked={this.state.constraintsGrid}
                onChange={(e) => this.setState({ constraintsGrid: e.target.checked })}
                label="Grid snap"
                tooltip="Enable constraints that snap node positions to a grid."
                /> */}
              {/* <SwitchOption
                checked={this.state.constraintsCircular}
                onChange={(e) => this.setState({ constraintsCircular: e.target.checked })}
                label="Circular cycles"
                tooltip="Enable constraints that highlight cycles of nodes by arranging them in a circular structure."
                /> */}
              
              <div><h6>Demo Options</h6></div>
              <SwitchOption
                checked={this.state.animated}
                onChange={(e) => this.setState({ animated: e.target.checked })}
                label="Animated layout"
                tooltip="Show an animation of all layout iterations, rather than just the final result."
                />
          </GridItem>
          <GridItem xs={12} sm={12} md={9} className={classes.graph}>
              {!this.state.layout ? null : (
                <Graph
                  key={`${Math.random()}`}
                  layout={this.state.layout}
                  animated={this.state.animated}
                  nodeColor={(n) => primaryColor}
                />
              )}
          </GridItem>
          <GridItem xs={12} className={classes.button}>
            <Button size="sm" onClick={() => this.setState((s) => ({ viewSource: !s.viewSource }))}>
              <ViewSourceIcon className={classes.icon}/>
              {this.state.viewSource ? "Hide" : "Show"} Code/Data
            </Button>
          </GridItem>
          <GridContainer xs={12} className={classNames({
            [classes.source]: true,
            [classes.sourceHidden]: !this.state.viewSource,
          })}>
            <GridItem xs={12} md={5} className={classes.codeblock}>
              <SyntaxHighlighter language="typescript" style={prism} className={classes.syntax}>
                {dataString}
              </SyntaxHighlighter>
            </GridItem>
            <GridItem xs={12} md={7} className={classes.codeblock}>
            <SyntaxHighlighter language="typescript" style={prism} className={classes.syntax}>
                {codeString}
              </SyntaxHighlighter>
            </GridItem>
          </GridContainer>
          
        </GridContainer>
      </div>
    );
  }
}


const styles = {
  section: {
    padding: "70px 0",
    textAlign: "center"
  },
  title: {
    ...title,
    marginBottom: "1rem",
    marginTop: 30,
    minHeight: 32,
    textDecoration: "none"
  },
  demo: {
      textAlign: "left",
  },
  label: {
    color: darkGrayColor,
  },
  suboptions: {
    paddingLeft: 8,
  },
  graph: {
    paddingTop: 10,
    paddingBottom: 10,
    overflow: 'auto',
    maxHeight: '75vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    textAlign: 'center',
  },
  icon: {
    marginRight: 6,
  },
  source: {
    transition: 'max-height 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
    overflow: 'hidden',
    height: 'auto',
    maxHeight: '150vh',
    fontSize: '13px',
  },
  sourceHidden: {
    maxHeight: 0,
  },
  codeblock: {
    maxHeight: '75vh',    
    overflow: 'auto',
    marginTop: 8,
    marginBottom: 8,
  },
  syntax: {
    margin: '0px !important',
  }
};

export default withStyles(styles)(DemoSection);
