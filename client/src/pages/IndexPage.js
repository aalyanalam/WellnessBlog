import { useEffect, useState } from "react";
import Post from "../Post";

export default function IndexPage() {
    const [posts,setPosts] = useState([]);
    useEffect(() => {
        fetch('http://ec2-52-15-155-181.us-east-2.compute.amazonaws.com:4000/post').then(response => {
            response.json().then(posts => {
                setPosts(posts);
            });
        });
    }, []);
    return (
        <>
            {posts.length > 0 && posts.map(post => (
                <Post {...post} />
            ))}
        </>
    );
}