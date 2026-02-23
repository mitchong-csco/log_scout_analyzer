# Call Flow Analysis: 001a2f8d-f17f0004-28...

**Duration:** In Progress | **Status:** 📞 Calling | **Messages:** 7

## Sequence Diagram

```text
       Caller               CUCM               Callee       
         |                   |                   |          
10:45:00.949
         |          <--- INVITE sip:1... ----         |          
10:45:00.994
         |          <--- SIP/2.0 100 ... ----         |          
10:45:01.099
         |          <--- SIP/2.0 180 ... ----         |          
10:45:02.891
         |          <--- SIP/2.0 200 OK ----         |          
10:45:02.941
         |          <--- ACK sip:1001... ----         |          
10:45:48.174
         |          <--- BYE sip:1001... ----         |          
10:45:48.219
         |          <--- SIP/2.0 200 OK ----         |          
```

## Call Summary

### Timing Metrics

- **Talk Time:** 45.233s
- **Total Duration:** 47.270s

### Message Statistics

- **Total Messages:** 7
- **Incoming:** 3
- **Outgoing:** 4

### Endpoints

- **Caller:** [SEP00000000111G] 5.5.5.240:5060
- **Callee:** 5.5.5.45:58096

