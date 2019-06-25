function count2(num){
    if(num>10000){
        return (Math.round(num/1e3)/10).toFixed(1)+'万'
    }else{
        return num
    }
};
function count(num){
    if(num<60){
        return num ="00:"+num
    }else if(num>=60 && num<3600){
        let m
        Math.floor(num/60)<10? m="0"+Math.floor(num/60) : m=Math.floor(num/60)
        num%60<10? num= m+":0"+ num%60 : num = m+":"+num%60
        return num
    }else{
        let h,m,s
        Math.floor(num%3600/60)<10? m="0"+Math.floor(num%3600/60) : m=Math.floor(num%3600/60)
        Math.floor(num%3600%60)<10? s="0"+Math.floor(num%3600%60) : s=Math.floor(num%3600%60)
        return num = Math.floor(num/3600)+":"+ m +":"+ s
    }
};
//时间戳转换
function timeChange(timestamp){
    let Y,M,D,h,m,s;
    var date = new Date(timestamp * 1000);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
    Y = date.getFullYear() + '-';
    M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
    D = date.getDate() <10 ? '0'+date.getDate() : date.getDate() + ' ';
    h = date.getHours() + ':';
    m = date.getMinutes() + ':';
    s = date.getSeconds();
    return Y+M+D;
}
//字符串转换
function stringChange(str){
    console.log(str.length)
    let _str=str.substring(30);
    console.log(_str)
    return `/video/${_str}`
}

export{
    count,
    count2,
    timeChange,
    stringChange
}