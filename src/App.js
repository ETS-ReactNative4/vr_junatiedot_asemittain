import React, { Component } from 'react';
import './App.css';
import { Table } from "react-bootstrap";
import { Button } from "react-bootstrap";
import { ButtonGroup } from "react-bootstrap";
import { Form } from "react-bootstrap";

const xhr = new XMLHttpRequest();



class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Aseman junatiedot</h1>
        </header>
        <SearchBar/>
      </div>
    );
  }
}


function ShowTrains(props){

  if ( props.value !== undefined ){

    var d = new Date(props.value.scheduledTime)
    var minutes = "";
    if ( d.getMinutes() < 10 ){
      minutes = "0" + d.getMinutes();
    }else{
      minutes = d.getMinutes();
    }

    return(
      <tr>
        <td>{props.value.train}</td>
        <td>{props.value.startingStation}</td>
        <td>{props.value.endingStation}</td>
        <td>{d.getHours() + ":" + minutes}</td>
      </tr>
    );
  }else{
    return(
      <tr></tr>
    );
  }
};



class SearchBar extends React.Component{

  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
    this.state = {
      suggestions: [],
      suggestionnames: [],
      stations: {},
      stationsshortcodetoname: {},
      selectedCity: "Station not selected.",
      stationTrainsArrival: {},
      stationTrainsDeparture: {},
    }
  }

  componentDidMount(){
    fetch("https://rata.digitraffic.fi/api/v1/metadata/stations")
    .then( results => results.json() )
    .then( data => {
      var stationswPassengers = [];
      var stationnameshorttofull = {};
      data.forEach(function(element){

        stationnameshorttofull[element.stationShortCode] = element.stationName;

        if (element.passengerTraffic !== false){
          stationswPassengers.push(element);
        }

      });
      this.setState({ stations: stationswPassengers,
                    stationsshortcodetoname: stationnameshorttofull, })
    });
  }




  handleChange(text){
    text.preventDefault();
    this.setState({ suggestions: [],
                    suggestionnames: []
                  });

    var suggestions = [];
    var suggestionnames = [];
    var user_input = this.filterTextInput.value;
    var i = 0;

    if ( user_input !== ""){
      this.state.stations.forEach(function(station) {

        if (station.stationName.toLowerCase().indexOf(user_input.toLowerCase()) === 0) {
          suggestions[i] = station;
          suggestionnames[i] = station.stationName;
          ++i;
        }
      });

      this.setState({
        suggestions: suggestions,
        suggestionnames: suggestionnames
      });
    }

  }

  rendersuggestion(){
    var suggestionbuttons = [];

    for ( var i = 0; i < this.state.suggestionnames.length; i++){
      suggestionbuttons = this.state.suggestionnames.map(station =>
          <Button className="Button" variant="light" block
            onClick={() => this.handleClick(station)} key={station}>
              {station}
          </Button>);
      };

    return(suggestionbuttons);
  };

  rendertrainschedules(type){
    var trainstoshow = [];
    var trains = [];

    if ( type === "ar"){
      trains = this.state.stationTrainsArrival;
    }else{
      trains = this.state.stationTrainsDeparture
    }
    for ( var i = 0; i < 10; i++){
      trainstoshow.push(<ShowTrains
        value = {trains[i]}
        key = {i}
      />);
    };
    return trainstoshow;
  };

  getArrivingAndDeparting( station ){

    var istationShortCode = this.state.suggestions.find( obj => {
      return obj.stationName === station;
    });

    istationShortCode = istationShortCode.stationShortCode;
    var codetoname = this.state.stationsshortcodetoname;

    var jsonrequest = {"query":"{ viewer { \
          getStationsTrainsUsingGET(station:\"" + istationShortCode + "\", \
          arriving_trains:20, departing_trains:20, include_nonstopping:false) { \
            trainNumber \
            trainType \
            timeTableRows { \
              actualTime \
              differenceInMinutes \
              liveEstimateTime \
              scheduledTime \
              stationShortCode \
              type \
            } \
          } \
        } \
      }"};

    jsonrequest = JSON.stringify(jsonrequest);
    const graphql_url = "https://rata.digitraffic.fi/api/v1/graphql/graphiql/?";
    xhr.open('POST', graphql_url, false);
    xhr.setRequestHeader("Content-Type", "application/json");

    var thisStationTrains = [];
    var thisStationTrainsDeparture = [];
    var d = new Date();
    var a = new Date();

    xhr.onreadystatechange = function() {

      if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {

        var responsetrains = JSON.parse(this.responseText);

        responsetrains.data.viewer.getStationsTrainsUsingGET.forEach(function(element){

            var timeTableRows = element.timeTableRows;

            timeTableRows.forEach(function(station_stats){

              if ( station_stats.liveEstimateTime === undefined){
                a = new Date(station_stats.scheduledTime);
              }else{
                a = new Date(station_stats.liveEstimateTime);
              };

              if ( station_stats.stationShortCode === istationShortCode &&
                a.getTime() > d.getTime()){

                console.log(station_stats);
                if ( station_stats.type === "ARRIVAL"){

                  thisStationTrains.push({"scheduledTime": a,
                    "train": element.trainType + " " + element.trainNumber,
                    "startingStation": codetoname[timeTableRows[0].stationShortCode],
                    "endingStation": codetoname[timeTableRows[ timeTableRows.length -1 ].stationShortCode]} );

                }

                if ( station_stats.type === "DEPARTURE" ){

                  thisStationTrainsDeparture.push({"scheduledTime": a,
                    "train": element.trainType + " " + element.trainNumber,
                    "startingStation": codetoname[timeTableRows[0].stationShortCode],
                    "endingStation": codetoname[timeTableRows[ timeTableRows.length -1 ].stationShortCode]});
                }

              }

            })

          });
          console.log(thisStationTrains);
          console.log(thisStationTrainsDeparture);
          function compare(a,b){
            if ( a.scheduledTime < b.scheduledTime){
              return -1;
            };
            if (a.scheduledTime > b.scheduledTime){
              return 1;
            };
            return 0;
          };

          thisStationTrains.sort(compare);
          thisStationTrains.splice(10,thisStationTrains.length - 1);
          thisStationTrainsDeparture.sort(compare);
          thisStationTrainsDeparture.splice(10,thisStationTrainsDeparture.length - 1);

      };
    };

    xhr.send(jsonrequest);
    this.setState({
      stationTrainsArrival: thisStationTrains,
      stationTrainsDeparture: thisStationTrainsDeparture
    });


  }


  handleClick(station){

    this.getArrivingAndDeparting(station);
    this.setState({
      suggestions: [],
      suggestionnames: [],
      selectedCity: station,
    })

  }

  render() {
    return(
      <div>

        <Form className = "SearchBar" onChange = { this.handleChange }>
          <input
            className = "SearchBox"
            placeholder = "Etsi asema"
            type = "text"
            name = "textsearch"
            ref = {node => (this.filterTextInput = node)}
            />
        </Form>

        <ButtonGroup vertical className="Suggestions">{ this.rendersuggestion() }</ButtonGroup>

        <div className="City">{this.state.selectedCity}</div>

        <Table className="Results" striped bordered hover>
          <thead>
            <tr>
              <th>Juna</th>
              <th>Lähtöasema</th>
              <th>Pääteasema</th>
              <th>Aika</th>
            </tr>
          </thead>
          <tbody>
            {this.rendertrainschedules("ar")}
          </tbody>
        </Table>
        <Table className="Results" striped bordered hover>
          <thead>
            <tr>
              <th>Juna</th>
              <th>Lähtöasema</th>
              <th>Pääteasema</th>
              <th>Aika</th>
            </tr>
          </thead>
          <tbody>
            {this.rendertrainschedules("de")}
          </tbody>
        </Table>
      </div>
    )
  }
};



export default App;
