import React from "react";

import {
FlatList,
Text,
TouchableOpacity,
StyleSheet,
View,
} from "react-native";

import {
router,
} from "expo-router";

export default function LiveNowRow({
streams,
}){

return(

<View>

<Text
style={styles.heading}
>

🔴 LIVE NOW

</Text>

<FlatList

horizontal

showsHorizontalScrollIndicator={false}

data={streams}

keyExtractor={(item)=>
item._id
}

renderItem={({item})=>(

<TouchableOpacity

style={styles.card}

onPress={()=>{

router.push({

pathname:"/player",

params:{

mediaId:item._id,

title:item.title,

videoUrl:item.playbackUrl,

},

});

}}

>

<Text
style={styles.title}
numberOfLines={1}
>

{item.title}

</Text>

<Text
style={styles.viewer}
>

👁 {item.viewers}

</Text>

</TouchableOpacity>

)}

 />

</View>

);

}

const styles=StyleSheet.create({

heading:{
color:"#FFF",
fontSize:20,
fontWeight:"700",
marginBottom:12,
},

card:{
width:180,
backgroundColor:"#1A1A1A",
padding:15,
borderRadius:12,
marginRight:12,
},

title:{
color:"#FFF",
fontWeight:"700",
},

viewer:{
color:"#FF5555",
marginTop:8,
},

});