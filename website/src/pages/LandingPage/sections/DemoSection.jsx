import React from "react";
import classNames from "classnames";

// @material-ui/core components
import withStyles from "@material-ui/core/styles/withStyles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import Switch from "@material-ui/core/Switch";
import Tooltip from "@material-ui/core/Tooltip";

// @material-ui/icons
import RadioIcon from "@material-ui/icons/FiberManualRecord";

// Syntax highlighter
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import prism from 'react-syntax-highlighter/dist/esm/styles/prism/prism';
import tomorrow from 'react-syntax-highlighter/dist/esm/styles/prism/tomorrow';

import GridContainer from "components/Grid/GridContainer.jsx";
import GridItem from "components/Grid/GridItem.jsx";

import { title, darkGrayColor, primaryColor } from "assets/jss/material-kit-react.jsx";
import tooltipsStyle from "assets/jss/material-kit-react/tooltipsStyle.jsx";

SyntaxHighlighter.registerLanguage('jsx', jsx);

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


class DemoSection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        animated: false,
        nodeChildren: false,
        nodeShape: false,
        nodePorts: false,
        edgeOrientation: false,
        edgeVariableLength: false,
        edgeRouting: false,
        edgeRoutingShape: 'linear',  // 'linear' | 'curved' | 'octilinear
        constraintsFlow: false,
        constraintsFlowDirection: 'single', // 'single' | 'multiple'
        constraintsNonoverlap: false,
        constraintsAlignment: false,
        constraintsCircular: false,
        constraintsGrid: false,
        showSource: false,
    };
  }

  render() {
    const { classes } = this.props;
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
          {/* <GridItem xs={12} sm={12} md={12}>
            
          </GridItem> */}
          <GridItem xs={12} sm={6} md={3}>
              <div><h6>Demo Options</h6></div>
              <SwitchOption
                checked={this.state.animated}
                onChange={(e) => this.setState({ animated: e.target.checked })}
                label="Animated layout"
                tooltip="Show an animation of all layout iterations, rather than just the final result."
                />
                
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
                label="Preferred orientation"
                tooltip="Enable forces that try to orient edges at specified angles. Demo: 0, 45, 90."
                />
              <SwitchOption
                checked={this.state.edgeVariableLength}
                onChange={(e) => this.setState({ edgeVariableLength: e.target.checked })}
                label="Variable length"
                tooltip="Enable different preferred lengths for edges. Demo: Jaccard scaling."
                />
              <SwitchOption
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
                 </GridContainer>
              
              <div><h6>Constraints</h6></div>
              <SwitchOption
                checked={this.state.constraintsFlow}
                onChange={(e) => this.setState({ constraintsFlow: e.target.checked })}
                label="Flow direction"
                tooltip="Enable constraints to make edges flow in a particular direction. Different parts of the graph may flow in different directions."
                />
                <GridContainer className={classes.suboptions}>
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
                
                </GridContainer>
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
              <SwitchOption
                checked={this.state.constraintsGrid}
                onChange={(e) => this.setState({ constraintsGrid: e.target.checked })}
                label="Grid snap"
                tooltip="Enable constraints that snap node positions to a grid."
                />
              <SwitchOption
                checked={this.state.constraintsCircular}
                onChange={(e) => this.setState({ constraintsCircular: e.target.checked })}
                label="Circular cycles"
                tooltip="Enable constraints that highlight cycles of nodes by arranging them in a circular structure."
                />
          </GridItem>
          <GridItem xs={12} sm={12} md={9} className={classes.graph}>
            <iframe
              src="storybook/?path=/story/force-models--spring-w-simple-nodes"
              style={{ width: '100%', minHeight: '75vh', height: '100%' }} />
          </GridItem>
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
  }
};

export default withStyles(styles)(DemoSection);
