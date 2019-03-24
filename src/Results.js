import React from 'react';
import './App.css';
import { Table } from "react-bootstrap";


class Results extends React.Component{

  constructor(props) {
    super(props);
    this.state = {
      arrivingtraindata: [],
      departingtraindata: [],
    };

  };

  rendertrainschedules(traindata){

    var trainstoshow = [];

    for ( var i = 0; i < 10; i++){
      trainstoshow.push(<ShowTrains
        value = {traindata[i]}
        key = {i}
      />);
    };
    return trainstoshow;
  };

  render(){
    return(
      <div>
      <div className = "scheduletype" > Saapuvat: </div>
      <Table className = "Results" striped bordered hover>
        <thead>
          <tr className = "Info">
            <th>Juna</th>
            <th>Lähtöasema</th>
            <th>Pääteasema</th>
            <th>Aika</th>
          </tr>
        </thead>
        <tbody>
          {this.rendertrainschedules(this.state.arrivingtraindata)}
        </tbody>
      </Table>
      <div className = "scheduletype">Lähtevät:</div>
      <Table className = "Results" striped bordered hover>
        <thead>
          <tr>
            <th>Juna</th>
            <th>Lähtöasema</th>
            <th>Pääteasema</th>
            <th>Aika</th>
          </tr>
        </thead>
        <tbody>
          {this.rendertrainschedules(this.state.departingtraindata)}
        </tbody>
      </Table>
      </div>
    );
  }
};

function ShowTrains(props){

  if ( props.value !== undefined ){

    var d = new Date(props.value.scheduledTime);
    var minutes = "";
    if ( d.getMinutes() < 10 ){
      minutes = "0" + d.getMinutes();
    }else{
      minutes = d.getMinutes();
    };

    return(
      <tr className = "TrainInfo">
        <th className = "TrainType">{props.value.train}</th>
        <th className = "TrainInfoRow">{props.value.startingStation}</th>
        <th className = "TrainInfoRow">{props.value.endingStation}</th>
        <th className = "Time">{d.getHours() + ":" + minutes}</th>
      </tr>
    );
  }else{
    return(
      <tr></tr>
    );
  }
};

export default Results;
