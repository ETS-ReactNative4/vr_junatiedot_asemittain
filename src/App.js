import React, { Component } from 'react';
import { render } from 'react-dom';
import './App.css';
import { Container } from "react-bootstrap";
import { Row } from "react-bootstrap";
import { Col } from "react-bootstrap";
import { Table } from "react-bootstrap";

const xhr = new XMLHttpRequest();



class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Aseman junatiedot</h1>
        </header>
        <SearchBar/>
      </div>
    );
  }
}



function ShowSuggestion(props){

  if ( props.value !== null ){
    return(<button className="Suggestionbox" onClick={props.onClick}>
          {props.value.stationName} </button>);
  }else{
    return(
      <div></div>
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
}



class SearchBar extends React.Component{

  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
    this.state = {
      suggestions: Array(10).fill(null),
      stations: {},
      stationsshortcodetoname: {},
      isCitySelected: false,
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
    this.setState({ suggestions: Array(10).fill(null) });
    var suggestions = this.state.suggestions.slice();
    var user_input = this.filterTextInput.value;
    var i = 0;

    if ( user_input !== ""){
      this.state.stations.forEach(function(station) {

        if (station.stationName.toLowerCase().indexOf(user_input.toLowerCase()) === 0) {
          suggestions[i] = station;
          ++i;
        }
      });

      this.setState({
        suggestions: suggestions
      });
    }

  }

  rendersuggestion(){
    var suggestionbuttons = [];
    for ( var i = 0; i < 10; i++){

      suggestionbuttons.push(<ShowSuggestion
              value = {this.state.suggestions[i]}
              onClick={() => this.handleClick(i)}
              />);
    };
    return(suggestionbuttons);
  };

  rendertrainschedules(type){
    var trainstoshow = [];
    var trains = [];

    if ( type == "ar"){
      trains = this.state.stationTrainsArrival;
    }else{
      trains = this.state.stationTrainsDeparture
    }
    for ( var i = 0; i < 10; i++){
      trainstoshow.push(<ShowTrains
        value = {trains[i]}
      />);
    };
    return trainstoshow;
  };

  /*renderArrival(i){

    return(<ShowTrains
            value = {this.state.stationTrainsArrival[i]}
            />
        );
  }
  renderDeparture(i){
    return(<ShowTrains
            value = {this.state.stationTrainsDeparture[i]}
            />
        );
  }*/


  getArrivingAndDeparting( i ){

    var istationShortCode = this.state.suggestions[i].stationShortCode;
    var codetoname = this.state.stationsshortcodetoname;

    var jsonrequest = {"query":"{ viewer { \
          getStationsTrainsUsingGET(station:\"" + istationShortCode + "\", arriving_trains:20, departing_trains:20, include_nonstopping:false) { \
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

              if ( station_stats.liveEstimateTime == undefined){
                a = new Date(station_stats.scheduledTime);
              }else{
                a = new Date(station_stats.liveEstimateTime);
              };

              if ( station_stats.stationShortCode === istationShortCode &&

                a.getTime() > d.getTime()){

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


  handleClick(i){
    if (this.state.suggestions[i] !== null ){
      this.filterTextInput.value = this.state.suggestions[i].stationName;
    }

    this.getArrivingAndDeparting(i);
    this.setState({
      suggestions: Array(10).fill(null),
      isCitySelected: true
    })

  }

  render() {

    return(
      <div>
        <div className = "Search-Bar" >
          <div>
            <form onChange = { this.handleChange }>
              <input
                className = "SearchBox"
                placeholder = "Etsi asema"
                type = "text"
                name = "textsearch"
                ref = {node => (this.filterTextInput = node)}
                />
            </form>
          </div>
        </div>
        <div className="suggestions">
              {this.rendersuggestion()}
        </div>

        <Table striped bordered hover>
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
            <Table  striped bordered hover>
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
