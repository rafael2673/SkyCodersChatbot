import React from 'react';
import axios from 'axios';

let usuario = "";
const link = "https://a0hrd6nmy2.execute-api.us-east-1.amazonaws.com/testes/send"

export default class BuscaMensagens extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
        }

        this.message = "";
    }
    
    componentDidMount() {
        const receberMensagem = async () => {               
            const result = await axios.post(link, {
                user: usuario,
                message: this.props.previousStep.message
            });

            const statusCode = (result && result.data) ? result.data.statusCode  : -1; 
            if(statusCode === 200) {  
                usuario = result.data.user;      
                this.message = result.data.lex;  
            } 

            this.setState({loading: !this.state.loading});
            const el = document.querySelector(".rsc-content"); 
            el.scrollTo({
              left: 0,
              top: el.scrollHeight,
              behavior: 'smooth'
            });
        }
                              
        receberMensagem();          
    }

    render() {        
        return (
            <span>{(!this.state.loading) ? this.message : "Um momento, por favor..."}</span>
        )
    }
}
