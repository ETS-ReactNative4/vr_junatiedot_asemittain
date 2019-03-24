import React from 'react';
import './App.css';
import { Button } from "react-bootstrap";
import { ButtonGroup } from "react-bootstrap";
import { Form } from "react-bootstrap";
import Results from './Results.js';


class SearchBar extends React.Component{

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.resultsElement = React.createRef();

    this.state = {
      suggestions: [],
      stations: {},
      stationsshortcodetoname: {},
      selectedcity: "Asemaa ei ole valittu.",
    };
  };

  // compononenDidMounts gets every stations code and full name that
  // has passanger traffic. These are needed for the suggestions of the
  // searchbar and code is needed to get the timetable of a certain station.
  componentDidMount(){

    fetch("https://rata.digitraffic.fi/api/v1/metadata/stations")
    .then( results => results.json() )
    .then( data => {

      var stationswithpassengers = [];
      var stationnameshorttofull = {};

      data.forEach(function(element){

        stationnameshorttofull[element.stationShortCode] = element.stationName;

        if (element.passengerTraffic !== false){
          stationswithpassengers.push({"stationName": element.stationName,
                                "stationShortCode": element.stationShortCode});
        };
      });

      this.setState({ stations: stationswithpassengers,
                    stationsshortcodetoname: stationnameshorttofull, });
    });
  };

  // This function handles the change of the searchbar and updates the
  // suggestions accordingly.
  handleChange(text){

    text.preventDefault();
    this.setState({ suggestions: [] });

    var suggestions = [];
    var user_input = this.filterTextInput.value;
    var i = 0;

    if ( user_input !== ""){

      this.state.stations.forEach(function(station) {

        if (station.stationName.toLowerCase().indexOf(user_input.toLowerCase()) === 0) {
          suggestions[i] = station;
          ++i;
        };

      });

      this.setState({
        suggestions: suggestions
      });
    };
  };

  // This renders the suggestions as buttons so that the user can selecte
  // which stations timetable they want.
  rendersuggestion(){

    var suggestionbuttons = [];
    var suggestionnames = [];

    this.state.suggestions.forEach(function(element){
      suggestionnames.push(element.stationName);
      }
    );

    for ( var i = 0; i < suggestionnames.length; i++){
      suggestionbuttons = suggestionnames.map(station =>
        <Button className="Button" variant="light"
          onClick={() => this.handleClick(station)} key={station}>
            {station}
        </Button>);
    };

    return(suggestionbuttons);
  };

  // This function sends a post request with necessary parametres to the vr api.
  // The api sends back data of the selected station. The data is processed
  // so  that we get the right trains from the timetable.
  getArrivingAndDeparting(station){

    var stationdata = this.state.suggestions.find( obj => {
      return obj.stationName === station;
    });

    var shortcodetoname = this.state.stationsshortcodetoname;

    var arrivingtrains = [];
    var departingtrains = [];
    var currenttime = new Date();
    var traintime = new Date();

    // Here we are getting 20 arrviving and departing because the vr api
    // in some cases does not return the amount of trains wanted even though
    // they should be in the time frame of the request.
    var jsonrequest = {"query":`{ viewer { \
          getStationsTrainsUsingGET(station: ${ "\""+ stationdata.stationShortCode + "\""},
            arriving_trains:20, departing_trains:20, include_nonstopping:false) {
              trainNumber
              trainType
              timeTableRows {
                actualTime
                differenceInMinutes
                liveEstimateTime
                scheduledTime
                stationShortCode
                type
              }
            }
        }}`
    };

    fetch("https://rata.digitraffic.fi/api/v1/graphql/graphiql/?", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonrequest)})
      .then(response => response.json())
      .then(state => {

          state.data.viewer.getStationsTrainsUsingGET.forEach(function(element){

              var trainstimetable = element.timeTableRows;

              trainstimetable.forEach(function(stationstats){

                if ( stationstats.liveEstimateTime === null ){
                  traintime = new Date(stationstats.scheduledTime);
                }else{
                  traintime = new Date(stationstats.liveEstimateTime);
                };

                if ( stationstats.stationShortCode === stationdata.stationShortCode
                  && traintime.getTime() > currenttime.getTime() ){

                  if ( stationstats.type === "ARRIVAL"  ){

                    arrivingtrains.push({"scheduledTime": traintime,
                      "train":
                        element.trainType + " " + element.trainNumber,
                      "startingStation":
                        shortcodetoname[trainstimetable[0].stationShortCode],
                      "endingStation":
                        shortcodetoname[trainstimetable[trainstimetable.length -1 ].stationShortCode]
                    });

                  }else{

                    departingtrains.push({"scheduledTime": traintime,
                      "train":
                        element.trainType + " " + element.trainNumber,
                      "startingStation":
                        shortcodetoname[trainstimetable[0].stationShortCode],
                      "endingStation":
                        shortcodetoname[trainstimetable[trainstimetable.length-1].stationShortCode]
                    });

                  };
                }
              })
            });

            function compare( a, b ){
              if ( a.scheduledTime < b.scheduledTime ){
                return -1;
              };
              if ( a.scheduledTime > b.scheduledTime ){
                return 1;
              };
              return 0;
            };

            arrivingtrains.sort(compare);
            arrivingtrains.splice(10,arrivingtrains.length - 1);
            departingtrains.sort(compare);
            departingtrains.splice(10,departingtrains.length - 1);

            this.resultsElement.current.setState({
              arrivingtraindata: arrivingtrains,
              departingtraindata: departingtrains
            });

        });

  };

  handleClick(station){

    this.getArrivingAndDeparting(station);
    this.setState({
      suggestions: [],
      selectedcity: station,
    });

  };

  render() {
    return(
      <div className = "ResultContainer">
        <Form onChange = {this.handleChange}>
          <input
            className = "SearchBox"
            placeholder = "Etsi asema"
            type = "text"
            name = "textsearch"
            ref = {node => (this.filterTextInput = node)}
            />
        </Form>
        <ButtonGroup vertical className = "Suggestions">{this.rendersuggestion()}</ButtonGroup>
        <p className = "City">{this.state.selectedcity}</p>
        <Results ref = {this.resultsElement}/>
      </div>
    );
  };
};

export default SearchBar;
