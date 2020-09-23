import React from 'react';
import Chat from 'react-simple-chatbot';
import { ThemeProvider } from 'styled-components';
import BuscaMensagens from './components/BuscaMensagens';
import { theme } from './components/style/theme';
// import {theme, avatarStyle, bubbleOptionStyle, rootStyle, contentStyle, footerStyle, inputStyle, submitButtonStyle} from './style/theme'
import './Chatbot.css';

const Chatbot = ({headerTitle, placeholder}) => {
  console.log("código!", "1061712315074-01");

  const steps = [
    {
      id: 'first',
      component: <BuscaMensagens />,
      asMessage: true,
      trigger: 'second'
    },
    {
      id: 'second',
      user: true,
      trigger: 'first',
    }
  ]

  return (
    <ThemeProvider theme={theme}>
      <Chat
        className='chat-container'
        headerTitle={headerTitle}
        // avatarStyle={avatarStyle}
        floating={true}
        placeholder={placeholder}
        // recognitionEnable={true}
        // recognitionLang="pt-br"
        // recognitionPlaceholder="Estou ouvindo ..."
        // botAvatar={process.env.PUBLIC_URL + '/skycoders.PNG'}
        // hideUserAvatar={true}
        // bubbleOptionStyle={bubbleOptionStyle}
        // contentStyle={contentStyle}
        // footerStyle={footerStyle}
        // inputStyle={inputStyle}
        // enableSmoothScroll={true}
        // submitButtonStyle={submitButtonStyle}
        // enableMobileAutoFocus={true}
        // style={rootStyle}
        steps={steps}
      />
    </ThemeProvider>
  )
}

Chatbot.schema = {
  title: 'editor.chatbot.title',
  description: 'editor.chatbot.description',
  type: 'object',
  properties: {
    headerTitle: {
      title: 'Header title',
      type: 'string',
      default: null
    },
    placeholder: {
      title: 'Input placeholder',
      type: 'string',
      default: null
    },
    
  },
}

export default Chatbot;
