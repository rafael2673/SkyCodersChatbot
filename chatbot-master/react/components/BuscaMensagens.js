import React from 'react';
import axios from 'axios';
import { useRuntime, withRuntimeContext } from 'vtex.render-runtime';

let usuario = "";
const link_en = "https://sry08m5un4.execute-api.us-east-1.amazonaws.com/dev/send";
const link_pt = "https://a0hrd6nmy2.execute-api.us-east-1.amazonaws.com/prod/send";


class BuscaMensagens extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loading: true }
		this.message = "";
    }
    
    componentDidMount() {		
		
        const receberMensagem = async () => { 
			const data = {
                user: usuario,
                message: this.props.previousStep.message
            }
			const options = {
				method: 'GET',
				headers: {"accept": "application/json; charset=utf-8",
					"content-type": "application/json;"},
				url: './api/vtexid/pub/authenticated/user'
			}
			if(!data.message) {
				let response = await axios(options);
				if (response.status === 200 && response.data) {
					data.email = response.data.user;
					data.userID = response.data.userID;
				}
			}		
			let link = (this.props.runtime.culture.language==='en') ? link_en : link_pt;		
            const result = await axios.post(link, data);

            const statusCode = (result && result.data) ? result.data.statusCode  : -1; 
            if(statusCode === 200) {  
                usuario = result.data.user;      
                const split = result.data.lex.split('<br/>');
                this.message = split.map((item, index) => { 
                    return (index === 0) ? item : <><br/>{item}</>;
                });				
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
            <span>{(!this.state.loading) ? this.message : "..."}</span>
        )
    }
}

export default withRuntimeContext(BuscaMensagens)
