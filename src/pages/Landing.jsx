import { Link } from "react-router-dom";

function Landing() {
  return (
    <div className="card">
      <h1>Secret Santa with Friends</h1>
      <p>
        Plan your gift exchange without spoiling the fun. Organizers add
        friends, set exclusions, and generate matches that only participants can
        see for themselves.
      </p>
      <div className="actions">
        <Link className="btn" to="/login">
          Let's start!
        </Link>
      </div>
    </div>
  );
}

export default Landing;
