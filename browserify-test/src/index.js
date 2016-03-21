import React from 'react';
import {render} from 'react-dom';
import Icon from 'react-iconpack';


class TestComponent extends React.Component {
    render() {
        return <Icon uri="polymer/notification/disc_full" width="48" height="48"/>;
    }
};


render(<TestComponent />, document.getElementById('test-node'));
