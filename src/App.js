import React, { Component } from 'react';
import { render } from 'react-dom';
import './App.css';
import { Container } from "react-bootstrap";
import { Row } from "react-bootstrap";
import { Col } from "react-bootstrap";
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
      <Container className="flex-container">
        <Col className="flex-item">{props.value.train}</Col>
        <Col className="flex-item">{props.value.startingStation}</Col>
        <Col className="flex-item">{props.value.endingStation}</Col>
        <Col className="flex-item">{d.getHours() + ":" + minutes}</Col>
      </Container>

    );
  }else{
    return(
      <div></div>
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


  rendersuggestion(i){
    return(<ShowSuggestion
            value = {this.state.suggestions[i]}
            onClick={() => this.handleClick(i)}
            />
        );
  }

  renderArrival(i){
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
  }


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

        <div className="suggestions">
            {this.rendersuggestion(0)}
            {this.rendersuggestion(1)}
            {this.rendersuggestion(2)}
            {this.rendersuggestion(3)}
            {this.rendersuggestion(4)}
            {this.rendersuggestion(5)}
            {this.rendersuggestion(6)}
            {this.rendersuggestion(7)}
            {this.rendersuggestion(8)}
            {this.rendersuggestion(9)}
          </div>

          <div className = "flex-container">
              <div className = "timetableheader">Saapuvat</div>
              <div className = "flex-info">Juna</div>
              <div className = "flex-info">Lähtöasema</div>
              <div className = "flex-info">Pääteasema</div>
              <div className = "flex-info">Aika</div>
          </div>
          {this.renderArrival(0)}
          {this.renderArrival(1)}
          {this.renderArrival(2)}
          {this.renderArrival(3)}
          {this.renderArrival(4)}
          {this.renderArrival(5)}
          {this.renderArrival(6)}
          {this.renderArrival(7)}
          {this.renderArrival(8)}
          {this.renderArrival(9)}

          <div className = "flex-container">
            <div className = "timetableheader">Lähtevät</div>
            <div className = "flex-info">Juna</div>
            <div className = "flex-info">Lähtöasema</div>
            <div className = "flex-info">Pääteasema</div>
            <div className = "flex-info">Aika</div>
          </div>
          <div>
            {this.renderDeparture(0)}
            {this.renderDeparture(1)}
            {this.renderDeparture(2)}
            {this.renderDeparture(3)}
            {this.renderDeparture(4)}
            {this.renderDeparture(5)}
            {this.renderDeparture(6)}
            {this.renderDeparture(7)}
            {this.renderDeparture(8)}
            {this.renderDeparture(9)}
          </div>
        </div>
    )
  }
};



export default App;
