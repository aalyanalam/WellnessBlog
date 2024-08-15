import { useContext, useEffect, useState } from "react";
import {useParams} from "react-router-dom";
import {format} from "date-fns";
import { UserContext } from "../UserContext";

export default function PostPage() {
    const [postInfo,setPostInfo] = useState(null);
    const {id} = useParams();
    useEffect(() => {
       fetch(`http://ec2-3-138-135-207.us-east-2.compute.amazonaws.com:4000/post/${id}`)
       .then(response => {
        response.json().then(postInfo => {
            setPostInfo(postInfo);
        });
       })
    }, []);

    if (!postInfo) return '';
    return (
        <div className="post-page">
            <h1>{postInfo.title}</h1>
            <time>{format(new Date(postInfo.createdAt), 'MMM d, yyyy HH:mm')}</time>
            <div className="author">by @{postInfo.author.username}</div>
            <div className="image">
            <img src={`http://ec2-52-15-155-181.us-east-2.compute.amazonaws.com:4000/${postInfo.cover}`} alt=""/>
            </div>
            <div className="content" dangerouslySetInnerHTML={{__html:postInfo.content}}></div>
        </div>
    );
}