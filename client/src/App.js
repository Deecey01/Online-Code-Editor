import './App.css';
import React, { useEffect, useState } from "react";
import axios from "axios";
import stubs from './defaultStubs';
import moment from "moment";

function App() {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [status, setStatus] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobDetails, setJobDetails] = useState(null);

  useEffect(() => {
    const defaultLang = localStorage.getItem("default-language") || "py";
    setLanguage(defaultLang);
  }, [])

  useEffect(() => {
    setCode(stubs[language]);
  }, [language]);

  const renderTimeDetails = () => {
    if (!jobDetails) {
      return "";
    }
    let { submittedAt, startedAt, completedAt } = jobDetails;
    let result = "";
    submittedAt = moment(submittedAt).toString();
    result += `Job Submitted At: ${submittedAt}  `;
    if (!startedAt || !completedAt) return result;
    const start = moment(startedAt);
    const end = moment(completedAt);
    const diff = end.diff(start, "seconds", true);
    result += `Execution Time: ${diff}s`;
    return result;
  };

  const setDefaultLanguage = () => {
    localStorage.setItem("default-language", language);
    console.log(`${language} set as default language`);
  }

  const handleSubmit = async () => {
    const payload = {
      language,
      code
    }
    try {
      setJobId("");
      setStatus("");
      setOutput("");
      const { data } = await axios.post("http://localhost:3030/run", payload);
      console.log(data);
      setJobId(data.jobId);

      let intervalId;

      intervalId = setInterval(async () => {
        const { data: dataRes } = await axios.get(
          "http://localhost:3030/status",
          { params: { id: data.jobId } }
        );
        const { success, job, error } = dataRes;
        if (success) {
          const { status: jobStatus, output: jobOutput } = job;
          setStatus(jobStatus);
          setJobDetails(job);
          if (jobStatus === "pending") return;
          setOutput(jobOutput);
          clearInterval(intervalId);
        } else {
          setStatus("Error: please retry");
          console.error(error);
          setOutput(error);
          clearInterval(intervalId);
        }
      }, 1000)

    } catch ({ response }) {
      if (response) {
        const errMsg = response.data.err.stderr;
        setOutput(errMsg);
      }
      else setOutput("Error connecting to the server");
    }
  }

  return (
    <div className="App">
      <h1>Online Code Compiler</h1>
      <div>
        <label>Language: </label>
        <select
          value={language}
          onChange={(e) => {
            let response = window.confirm(
              "WARNING: Switching the language, will remove your progress!"
            );
            if (response) setLanguage(e.target.value);
          }}>
          <option value="cpp">C++</option>
          <option value="py">Python</option>
        </select>
      </div>
      <br />
      <div>
        <button onClick={setDefaultLanguage}>Set Default</button>
      </div>
      <br />
      <textarea rows="20" cols="75" value={code} onChange={(e) => { setCode(e.target.value) }}>
      </textarea>
      <br />
      <button onClick={handleSubmit}>Submit</button>
      <p>{status}</p>
      <p>{jobId && `JobID: ${jobId}`}</p>
      <p>{renderTimeDetails()}</p>
      <p>{output}</p>
    </div>
  );
}

export default App;
