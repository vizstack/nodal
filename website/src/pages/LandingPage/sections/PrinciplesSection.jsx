import React from "react";
// @material-ui/core components
import withStyles from "@material-ui/core/styles/withStyles";

// @material-ui/icons
import ComposableIcon from "@material-ui/icons/Extension";
import HackableIcon from "@material-ui/icons/Build";
import IntuitiveIcon from "@material-ui/icons/DeviceHub";

import GridContainer from "components/Grid/GridContainer.jsx";
import GridItem from "components/Grid/GridItem.jsx";
import InfoArea from "components/InfoArea/InfoArea.jsx";

import { title } from "assets/jss/material-kit-react.jsx";

class PrinciplesSection extends React.Component {
  render() {
    const { classes } = this.props;
    return (
      <div className={classes.section}>
        {/* <GridContainer justify="center">
          <GridItem xs={12} sm={12} md={8}>
            <h2 className={classes.title}>Let's talk product</h2>
            <h5 className={classes.description}>
              This is the paragraph where you can write more details about your
              product. Keep you user engaged by providing meaningful
              information. Remember that by this time, the user is curious,
              otherwise he wouldn't scroll to get here. Add a button if you want
              the user to see more.
            </h5>
          </GridItem>
        </GridContainer> */}
        <div>
          <GridContainer>
            <GridItem xs={12} sm={12} md={4}>
              <InfoArea
                title="Composable"
                description={<span>Nodal allows you to build graph layouts by assembling <b>small, predictable pieces</b> (like points, forces, and constraints) into more complex structures and behaviors.</span>}
                icon={ComposableIcon}
                iconColor="primary"
                vertical
              />
            </GridItem>
            <GridItem xs={12} sm={12} md={4}>
              <InfoArea
                title="Hackable"
                description={<span>Nodal is designed with an appreciation of the diversity of graph layout needs. Its <b>elegant, well-documented abstractions</b> are easy to extend or replace for domain-specific applications.</span>}
                icon={HackableIcon}
                iconColor="primary"
                vertical
              />
            </GridItem>
            <GridItem xs={12} sm={12} md={4}>
              <InfoArea
                title="Intuitive"
                description={<span>Nodal is based on <b>gradient-descent</b> rather than the inscrutable algorithms of traditional layout. This allows you to leverage <b>physical and geometric intuitions</b> while tuning your graphs.</span>}
                icon={IntuitiveIcon}
                iconColor="primary"
                vertical
              />
            </GridItem>
          </GridContainer>
        </div>
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
    marginTop: "30px",
    minHeight: "32px",
    textDecoration: "none"
  },
  description: {
    color: "#999"
  }
};

export default withStyles(styles)(PrinciplesSection);
