import React from 'react';
import Chat from 'react-simple-chatbot';
import { ThemeProvider } from 'styled-components';
import BuscaMensagens from './components/BuscaMensagens';
import { avatarStyle, bubbleStyle, rootStyle, contentStyle } from './components/style/theme'
import './Chatbot.css';
// import imageBot from '../../react/public/skycoders.png'

const Chatbot = ({
  headerTitle,
  placeholder,
  theme,
  botAvatar,
  recognitionEnable,
  hideUserAvatar,
  userAvatar,
  floatingIcon,
  submitButtonStyle,
  inputStyle
}) => {
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
        headerTitle={headerTitle}
        avatarStyle={avatarStyle}
        floating={true}
        floatingIcon={floatingIcon}
        placeholder={placeholder}
        recognitionEnable={recognitionEnable}
        recognitionLang="pt-br"
        recognitionPlaceholder="Estou ouvindo ..."
        botAvatar={botAvatar}
        userAvatar={userAvatar}
        hideUserAvatar={hideUserAvatar}
        bubbleStyle={bubbleStyle}
        contentStyle={contentStyle}
        inputStyle={inputStyle}
        enableSmoothScroll={true}
        submitButtonStyle={submitButtonStyle}
        enableMobileAutoFocus={true}
        style={rootStyle}
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
    floatingIcon: {
      title: 'Floating icon',
      type: 'string',
      widget: {
        'ui:widget': 'image-uploader',
      },
    },
    headerTitle: {
      title: 'Header title',
      type: 'string',
      default: 'Seja bem vindo'
    },
    placeholder: {
      title: 'Input placeholder',
      type: 'string',
      default: 'Digite uma mensagem...'
    },
    hideBotAvatar: {
      title: 'Disable bot avatar',
      type: 'boolean',
      default: false
    },
    botAvatar: {
      title: 'Bot avatar',
      type: 'string',
      widget: {
        'ui:widget': 'image-uploader',
      },
    },
    hideUserAvatar: {
      title: 'Disable user avatar',
      type: 'boolean',
      default: false
    },
    userAvatar: {
      title: 'User avatar',
      type: 'string',
      widget: {
        'ui:widget': 'image-uploader',
      },
    },
    recognitionEnable: {
      title: 'Voice recognition',
      description: 'habilitar/desabilitar reconhecimento por voz',
      type: 'boolean',
      default: false
    },

    theme: {
      title: 'Chatbot Theme',
      type: 'object',
      properties: {
        background: {
          title: 'Background color',
          type: 'string',
          default: '#ffffff'
        },
        headerBgColor: {
          title: 'Header background color',
          type: 'string',
          default: '#005792'
        },
        headerFontColor: {
          title: 'Header font color',
          type: 'string',
          default: '#edf9fc'
        },
        headerFontSize: {
          title: 'Header font size',
          type: 'string',
          default: '18px'
        },
        botBubbleColor: {
          title: 'Bot bubble color',
          type: 'string',
          default: '#F2F2F2'
        },
        botFontColor: {
          title: 'Bot font color',
          type: 'string',
          default: '#0B243B'
        },
        userBubbleColor: {
          title: 'User bubble color',
          type: 'string',
          default: '#EFF2FB'
        },
        userFontColor: {
          title: 'User font color',
          type: 'string',
          default: '#005792'
        },
      },
    },
    submitButtonStyle: {
      title: 'Submit button style',
      type: 'object',
      properties: {
        fill: {
          title: 'Submit button color',
          type: 'string',
        }
      }
    },
    inputStyle: {
      title: 'Input style',
      type: 'object',
      properties: {
        color: {
          title: 'Input font color',
          type: 'string',
        },
        backgroundColor: {
          title: 'Input background color',
          type: 'string',
        },
      }
    },

  },
}

export default Chatbot;
