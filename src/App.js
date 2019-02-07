import React, { Component } from 'react';
import './App.css';



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
          <div className="TrainRow">
            <div className="Train">
            {props.value.train}
            </div>
            <div className="Start">
            {props.value.startingStation}
            </div>
            <div className="End">
            {props.value.endingStation}
            </div>
            <div className="Time">
            {d.getHours() + ":" + minutes}
            </div>
          </div>

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
        if (element.passengerTraffic !== false){
          stationswPassengers.push(element);
          stationnameshorttofull[element.stationShortCode] = element.stationName;
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


  postData( i ){


    var d = new Date();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var str_month = "";
    var str_day = "";

    if ( month < 10 ){
      str_month = "0" + month.toString();
    }else{
      str_month = month.toString();
    }

    if ( month < 10 ){
      str_day = "0" + day.toString();
    }else{
      str_day = day.toString();
    }


    var istationShortCode = this.state.suggestions[i].stationShortCode;
    var codetoname = this.state.stationsshortcodetoname;

    //var url = "https://rata.digitraffic.fi/api/v1/trains/"+ d.getFullYear().toString()+ "-" +str_month + "-" + str_day;
    var url = "https://rata.digitraffic.fi/api/v1/live-trains/station/" + istationShortCode + "?arriving_trains=10&departing_trains=10&include_nonstopping=false";
    console.log(url);
    fetch(url).then(response => response.json()).then(data => {
      var thisStationTrains = [];
      var thisStationTrainsDeparture = [];
      var timeminus2h = new Date();
      var d = new Date();

      //console.log(d);
      console.log(data);
      console.log(codetoname);
      data.forEach(function(element){

        var timeTableRows = element.timeTableRows;
        var train = "";

        timeTableRows.forEach(function(station_stats){
          var a = new Date();
          if ( station_stats.liveEstimateTime == undefined){
            a = new Date(station_stats.scheduledTime);
          }else{
            a = new Date(station_stats.liveEstimateTime);
          };

          if ( station_stats.stationShortCode === istationShortCode && a.getTime() > d.getTime() && station_stats.commercialStop == true){

            if ( station_stats.type === "ARRIVAL"){
              train = element.trainType + " " + element.trainNumber;
              thisStationTrains.push({"scheduledTime": a, "train": train, "startingStation": codetoname[timeTableRows[0].stationShortCode], "endingStation": codetoname[timeTableRows[ timeTableRows.length -1 ].stationShortCode]} );
            }
            if ( station_stats.type === "DEPARTURE" ){
              train = element.trainType + " " + element.trainNumber;
              thisStationTrainsDeparture.push({"scheduledTime": a, "train": train, "startingStation": codetoname[timeTableRows[0].stationShortCode], "endingStation": codetoname[timeTableRows[ timeTableRows.length -1 ].stationShortCode]});
            }
          }
        })

      });
      /*data.forEach(function(element){
        var timeTableRows = element.timeTableRows;
        var train = "";
        timeTableRows.forEach(function(station_stats){
          var a = new Date(station_stats.scheduledTime);
          if ( station_stats.stationShortCode === istationShortCode && d < a){
            if ( station_stats.type === "ARRIVAL"){
              train = element.trainType + " " + element.trainNumber;
              thisStationTrains.push({"scheduledTime": station_stats.scheduledTime, "train": train, "startingStation": timeTableRows[0].hortCode, "endingStation": timeTableRows[ timeTableRows.length -1 ].stationShortCode});
            }
            if ( station_stats.type === "DEPARTURE"){
              train = element.trainType + " " + element.trainNumber;
              thisStationTrainsDeparture.push({"scheduledTime": station_stats.scheduledTime, "train": train, "startingStation": timeTableRows[0].stationShortCode, "endingStation": timeTableRows[ timeTableRows.length -1 ].stationShortCode});
            }
          }
        })

      })*/
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

      this.setState({
        stationTrainsArrival: thisStationTrains,
        stationTrainsDeparture: thisStationTrainsDeparture
      })
    });


  }


  handleClick(i){
    if (this.state.suggestions[i] !== null ){
      this.filterTextInput.value = this.state.suggestions[i].stationName;
    }

    this.postData(i);
    this.setState({
      suggestions: Array(10).fill(null),
      isCitySelected: true
    })

  }

  render() {
    const suggestions = this.state.suggestions.slice()
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

        <div>
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
          <div>Saapuvat</div>
          <div>
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
          </div>
          <div>Lähtevät</div>
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
