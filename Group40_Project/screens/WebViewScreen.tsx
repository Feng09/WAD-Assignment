import React from 'react';
import {View, StyleSheet} from 'react-native';
import{WebView} from 'react-native-webview';

export default function WebViewScreen({route}:any){
    const {url} = route.params;
    return(
        <View style ={s.container}>
            <WebView source ={{uri:url}}/>
        </View>
    );
}
const s = StyleSheet.create({
    container:{flex:1},
});